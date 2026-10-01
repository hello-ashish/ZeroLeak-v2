# ZeroLeak-v2 — Database Performance Optimization Report (Part 2)

---

## 🟡 MEDIUM Issues (Fixed)

### 16. `recordIncident` — 9+ DB Queries In Single Request
**File:** `cheating.controllers.js`
**Severity:** 🟡 Medium

**Problem:** 
When recording a cheating incident, the system performed 9 or more sequential database operations. It awaited `CheatingIncident.create`, then `notifyAdmins`, then `notifyAuditors`, then `createNotification` for the student, and finally `Anomaly.create`.

**Impact:** 
A single cheating incident could stall the API response by hundreds of milliseconds, blocking the Node.js event loop and holding a database connection hostage while it sequentially recorded telemetry and fired off notifications.

**Solution:** 
Refactored the function to use a **Fire-and-Forget** pattern for non-critical side effects. Notifications and telemetry logging are now pushed to the background without `await`ing their resolution.

**Code Comparison:**
```javascript
// ❌ BEFORE
await notifyAdmins({ ... });
await notifyAuditors({ ... });
await createNotification({ ... });
await Anomaly.create({ ... });
return res.status(201).json({ message: "Recorded" });

// ✅ AFTER
notifyAdmins({ ... }).catch(e => console.error(e));
notifyAuditors({ ... }).catch(e => console.error(e));
createNotification({ ... }).catch(e => console.error(e));
Anomaly.create({ ... }).catch(e => console.error(e));
return res.status(201).json({ message: "Recorded" }); // Responds instantly
```

---

### 17. Socket Authentication — 2 DB Lookups Per Connection
**File:** `proctoring.socket.js`
**Severity:** 🟡 Medium

**Problem:** 
During WebSocket authentication, the backend did not know if the connecting user was an Admin or a Student. It guessed by querying the `Admin` model first. If it returned null, it queried the `Student` model. 

**Impact:** 
Since 99% of socket connections are from students taking exams, this forced MongoDB to perform a guaranteed failed `Admin` lookup query for every single student connection, doubling the database load during exam rushes.

**Solution:** 
Swapped the query order. It now checks the `Student` collection first, reducing queries per student connection from 2 to 1.

**Code Comparison:**
```javascript
// ❌ BEFORE
const admin = await Admin.findById(decoded.id);
if (admin) return next();
const student = await Student.findById(decoded.id);
if (student) return next();

// ✅ AFTER
const student = await Student.findById(decoded.id);
if (student) return next();
const admin = await Admin.findById(decoded.id);
if (admin) return next();
```

---

### 18. `getAnomalies` — Populates relatedEvents Without Pagination
**File:** `auditor.controllers.js`
**Severity:** 🟡 Medium

**Problem:** 
The Auditor dashboard was fetching every single `Anomaly` in the database and populating its `relatedEvents` array without any `limit()` or pagination.

**Impact:** 
As the system runs for months, the `Anomaly` collection grows unbounded. Loading thousands of anomalies and their populated arrays into memory would eventually crash the server with an Out of Memory error.

**Solution:** 
Added standard `page` and `limit` query parameters, and implemented `.skip()` and `.limit()` along with `.lean()` to return lightweight JSON objects instead of heavy Mongoose documents.

**Code Comparison:**
```javascript
// ❌ BEFORE
const anomalies = await Anomaly.find().sort({ createdAt: -1 }).populate("relatedEvents");
return res.status(200).json({ anomalies });

// ✅ AFTER
const anomalies = await Anomaly.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("relatedEvents")
    .lean();
```

---

### 19. `globalSearch` — Regex Searches Without Text Indexes
**File:** `search.controllers.js`
**Severity:** 🟡 Medium

**Problem:** 
The global search feature was using case-insensitive Regular Expressions (`new RegExp(q, "i")`) across 4 collections (`Student`, `Professor`, `Batch`, `Exam`).

**Impact:** 
MongoDB cannot use standard B-Tree indexes for un-anchored case-insensitive regex searches. This forced a "Collection Scan" across all 4 collections every time someone typed a letter into the search bar.

**Solution:** 
Added highly-optimized MongoDB Text Indexes (`$text`) to all 4 Mongoose Schemas, and refactored the search controller to use `{ $text: { $search: q } }`.

**Code Comparison:**
```javascript
// ❌ BEFORE
const regex = new RegExp(q, "i");
Student.find({ $or: [{ name: regex }, { email: regex }] });

// ✅ AFTER (Schema)
studentSchema.index({ name: 'text', email: 'text' });

// ✅ AFTER (Controller)
Student.find({ $text: { $search: q } }); // Uses fast text index bounds scan
```

---

### 20. `pingSession` — Complex Multi-Query Logic On Every Heartbeat
**File:** `student.controllers.js`
**Severity:** 🟡 Medium

**Problem:** 
The student frontend pings the server every 10 seconds. The `pingSession` controller modified properties on the student object and then called `await student.save()`, which triggers Mongoose validation and a full-document replacement. It also contained heavy security enforcement logic that ran sequentially.

**Impact:** 
100 students pinging every 10 seconds = 600 heavy `save()` operations per minute, wasting database CPU and creating massive Write Locks.

**Solution:** 
Added a "Happy Path" early return. If a student's warning count is below the threshold, it performs a lightweight atomic `$set` update (`findByIdAndUpdate`) and immediately responds, bypassing the heavy `save()` entirely.

**Code Comparison:**
```javascript
// ❌ BEFORE
const student = req.student;
student.lastActiveAt = new Date();
// ... multiple heavy checks ...
await student.save(); // Heavy, full-document save

// ✅ AFTER
if (warningCount < MAX_VIOLATIONS) {
    // Happy path (99% of requests)
    await Student.findByIdAndUpdate(student._id, { 
        $set: { lastActiveAt: new Date() } 
    });
    return res.status(200).json({ message: "Ping successful" });
}
```
