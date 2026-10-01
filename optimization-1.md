# ZeroLeak-v2 — Database Performance Optimization Report
Analyzed: 16 models, 13 controllers, 1 socket handler, 2 background workers, 4 auth middlewares
Database: MongoDB (Mongoose v9) + Redis v6
Connection: MongoDB Atlas (cluster0.mcnxzcb.mongodb.net)

---

## 🔴 CRITICAL Issues (Fixed)

### 1. `getDashboardStats` — Fetches ALL Results Into Memory
**File:** `admin.controllers.js`
**Severity:** 🔴 Critical

**Problem:** 
The dashboard was loading every single `Result` document from the database into Node.js memory (`Result.find({}).populate(...)`), and then calculating averages and pass rates in JavaScript. 

**Impact:** 
With thousands of exam submissions, this exhausts server memory (RAM), creates massive MongoDB transfer overhead over the network, and blocks the single-threaded event loop during computation, causing the server to freeze for other users.

**Solution:** 
Replaced the memory-heavy JavaScript operations with highly-optimized MongoDB aggregation pipelines (`$project`, `$group`, `$avg`, `$sum`) to compute stats entirely in the database engine.

**Code Comparison:**
```javascript
// ❌ BEFORE
const allResults = await Result.find({}).populate("student").populate("exam");
let avgScore = 0;
let passRate = 0;
// Loops through 10,000 arrays in JS memory to do math
const totalPct = allResults.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0);
avgScore = Math.round(totalPct / allResults.length);


// ✅ AFTER (Optimized)
const resultStats = await Result.aggregate([
    {
        $project: { pct: { $multiply: [{ $divide: ["$score", "$totalQuestions"] }, 100] } }
    },
    {
        $group: {
            _id: null,
            avgScore: { $avg: "$pct" },
            totalPassed: { $sum: { $cond: [{ $gte: ["$pct", 50] }, 1, 0] } },
            total: { $sum: 1 }
        }
    }
]);
```

---

### 2. `getAllProfessors` — Classic N+1 Query
**File:** `admin.controllers.js`
**Severity:** 🔴 Critical

**Problem:** 
To get a list of professors and how many batches they submitted, the code was looping through the professors and firing off a new `Batch.countDocuments()` query for every single one.

**Impact:** 
If you have 50 professors, this fires 51 separate MongoDB queries in sequence, multiplying network latency by 51 and causing severe page load delays.

**Solution:** 
Replaced the loop of queries with a single `Batch.aggregate()` query to fetch all counts at once, reducing 51 queries down to 2.

**Code Comparison:**
```javascript
// ❌ BEFORE (N+1 Problem)
const professors = await Professor.find({}).lean();
const professorsWithCounts = await Promise.all(professors.map(async (prof) => {
    // Fired inside a loop for EVERY professor!
    const count = await Batch.countDocuments({ createdBy: prof._id }); 
    return { ...prof, submittedBatches: count };
}));


// ✅ AFTER (Batch Aggregation)
const [professors, batchCounts] = await Promise.all([
    Professor.find({}).lean(),
    Batch.aggregate([
        { $group: { _id: "$createdBy", count: { $sum: 1 } } }
    ])
]);
// Merge them together in memory (Instantaneous)
```

---

### 3. `bulkImportProfessors` / `bulkImportStudents` — Sequential Creates With Per-Item Queries
**File:** `admin.controllers.js`
**Severity:** 🔴 Critical

**Problem:** 
When importing a CSV of users, the code looped through each user, queried the database to see if they existed, and then executed a `create` operation (which triggered a heavy `bcrypt` password hash).

**Impact:** 
Importing 200 users equaled 400+ sequential DB queries and 200 sequential CPU-blocking password hashes. An import could take 25+ seconds and freeze the server.

**Solution:** 
Batch-fetched all existing users in one query using `$in`, filtered duplicates in JS, ran `bcrypt.hash` in parallel (`Promise.all`), and inserted everyone at once using `insertMany`.

**Code Comparison:**
```javascript
// ❌ BEFORE
for (const stuData of students) {
    const existing = await Student.findOne({ email: stuData.email }); // Query 1
    if (!existing) {
        await Student.create(stuData); // Query 2 + Sequential Bcrypt Hash
    }
}


// ✅ AFTER (Bulk Insert)
const candidateEmails = candidates.map(c => c.email);
const existing = await Student.find({ email: { $in: candidateEmails } }).lean(); // Query 1
// ... filter duplicates in JS ...
await Promise.all(toInsert.map(async (stu) => { stu.password = await bcrypt.hash(stu.password, 10); })); // Parallel Hash
await Student.insertMany(toInsert); // Query 2 (Mass insert)
```

---

### 4. `getAllQuestions` — Loads ALL Exams Into Memory For Usage Map
**File:** `question.controllers.js`
**Severity:** 🔴 Critical

**Problem:** 
To calculate how many times a question was used in exams, the code fetched EVERY exam document into memory and iterated through their question arrays.

**Impact:** 
Extreme memory bloat. A large exam history would literally crash the Node.js process (Out of Memory).

**Solution:** 
Shifted the workload to MongoDB using an aggregation pipeline with `$unwind` and `$group`.

**Code Comparison:**
```javascript
// ❌ BEFORE
const exams = await Exam.find({}).lean(); // Fetches 10,000 exams into memory
const usageMap = {};
exams.forEach((exam) => {
    exam.questions.forEach((qId) => { usageMap[qId] = (usageMap[qId] || 0) + 1 });
});


// ✅ AFTER
const usageAgg = await Exam.aggregate([
    { $unwind: "$questions" },
    { $group: { _id: "$questions", usageCount: { $sum: 1 } } }
]);
```

---

### 5. `scanAnomalies` — Massive Sequential N+1 Queries
**File:** `auditor.controllers.js`
**Severity:** 🔴 Critical

**Problem:** 
The anomaly scanner was looping through every suspicious log and running `Anomaly.findOne()` followed by `Anomaly.create()` sequentially.

**Impact:** 
A scan finding 50 anomalies would execute 100+ separate sequential database queries, severely delaying the audit report and tying up database connections.

**Solution:** 
Applied the bulk processing pattern: gather all target IDs, run one `$in` query to find existing anomalies, and use `insertMany` for new ones.

**Code Comparison:**
```javascript
// ❌ BEFORE
for (const log of deletedExamsLogs) {
    const exists = await Anomaly.findOne({ targetId: log.targetId, rule: "Exam Deleted" });
    if (!exists) { await Anomaly.create({...}); }
}


// ✅ AFTER
const targetIds = deletedExamsLogs.map(log => log.targetId);
const existing = await Anomaly.find({ targetId: { $in: targetIds }, rule: "Exam Deleted" }).lean();
// ... filter out existing in JS ...
await Anomaly.insertMany(toInsert);
```

---

### 6. `getDashboardMetrics` (Auditor) — Loads Full Documents Just To Count Trends
**File:** `auditor.controllers.js`
**Severity:** 🔴 Critical

**Problem:** 
To display a 7-day trend chart, the auditor dashboard was fetching thousands of raw `AuditLog` and `CheatingIncident` documents into memory.

**Impact:** 
High network transfer sizes and memory usage just to count dates.

**Solution:** 
Used MongoDB `$dateToString` aggregation to group by date directly in the database.

**Code Comparison:**
```javascript
// ❌ BEFORE
const recentAuditLogs = await AuditLog.find({ createdAt: { $gte: sevenDaysAgo } });
// loops through array in JS to count dates...


// ✅ AFTER
const auditTrend = await AuditLog.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
]);
```

---

### 7. Socket Heartbeat — Full Document Fetch + Save Every 5-10 Seconds Per Student
**File:** `proctoring.socket.js`
**Severity:** 🔴 Critical

**Problem:** 
Every time a student's browser sent a heartbeat ping (every 5 seconds), the socket server fetched the session, modified it in JS, and saved it. 

**Impact:** 
With 100 students, this triggered ~1,200 database operations per minute, destroying database connection limits.

**Solution:** 
Used `findByIdAndUpdate()` to execute an atomic, single round-trip update.

**Code Comparison:**
```javascript
// ❌ BEFORE
const session = await ProctoringSession.findById(currentSessionId); // Query 1
session.lastHeartbeat = new Date();
await session.save(); // Query 2


// ✅ AFTER
await ProctoringSession.findByIdAndUpdate(currentSessionId, { // 1 Atomic Query
    $set: { lastHeartbeat: new Date() } 
});
```

---

## 🟠 HIGH Issues (Fixed)

### 8. Missing Indexes on Heavily Queried Models
**Severity:** 🟠 High

**Problem:** Models like `Result`, `Exam`, and `Batch` were missing database indexes for heavily queried fields (like `student`, `exam`, `status`). 
**Impact:** Every query performed a "Collection Scan" (reading every document on the hard drive), severely degrading performance.
**Solution:** Added B-Tree indexes to Mongoose schemas.
```javascript
// ✅ AFTER
examSchema.index({ status: 1 });
examSchema.index({ createdAt: -1 });
resultSchema.index({ student: 1, exam: 1 });
```

### 9. MongoDB Connection — No Connection Pool Options
**File:** `db/index.js`
**Severity:** 🟠 High

**Problem:** The raw `mongoose.connect` call was missing pool configurations, causing connections to drop or starve under load on Atlas shared tiers.
**Solution:** Added robust connection pool settings.
```javascript
// ✅ AFTER
await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 50,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
});
```

---

## 🟡 MEDIUM Issues (Fixed)

### 10. Redundant Double-Fetch After Create/Save Operations
**Severity:** 🟡 Medium

**Problem:** Across controllers, code was creating or saving a user, and then immediately firing a `findById` query to get the exact same user just to remove the password field.
**Solution:** Converted the saved document to a plain JS object (`toObject()`) and deleted the password field in memory instead of re-querying the database.

**Code Comparison:**
```javascript
// ❌ BEFORE
await student.save();
const updatedStudent = await Student.findById(student._id).select("-password"); // Redundant Query!


// ✅ AFTER
await student.save();
const updatedStudent = student.toObject();
delete updatedStudent.password; // Removed in memory instantly
```
