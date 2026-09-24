# MongoDB Usage in ZeroLeak-v2

This document provides a comprehensive overview of how MongoDB is utilized within the **ZeroLeak-v2** project. The project uses **Mongoose**, an Object Data Modeling (ODM) library for MongoDB and Node.js, to interact with the database. It manages relationships between data, provides schema validation, and translates between objects in code and the representation of those objects in MongoDB.

## 1. Schemas and Models

In Mongoose, everything is derived from a Schema. Each schema maps to a MongoDB collection and defines the shape of the documents within that collection.

### Example: Admin Schema (`admin.models.js`)
```javascript
const adminSchema = new Schema(
    {
        adminId: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: [true, "Password is required"] }
    }, 
    { timestamps: true } // Automatically adds createdAt and updatedAt fields
);
```

### Key Schema Features Used:
- **Types**: `String`, `Number`, `Boolean`, `Date`, `Array`, `ObjectId` (used for referencing other models).
- **Constraints**: `required`, `unique`, `lowercase`, `trim` ensure data integrity before it reaches the database.
- **Timestamps**: Setting `{ timestamps: true }` automatically manages `createdAt` and `updatedAt` properties.
- **Middleware / Hooks**: E.g., `adminSchema.pre("save", ...)` runs logic *before* a document is saved to the database. In this project, it's heavily used to hash passwords using `bcrypt` before storing them.
- **Instance Methods**: Custom methods like `adminSchema.methods.isPasswordCorrect` can be attached to the document directly.

---

## 2. Mongoose Functions & Methods

The controllers in `backend/src/controllers` use various Mongoose methods to perform CRUD operations. Here is a breakdown of the functions used, what they do, and an example of their use in the project.

### 2.1 Creation Methods
- **`Model.create(doc)`**: Saves one or more documents to the database.
  - *Project Example*: `await Admin.create({ adminId, email, password });` (Creates a new Admin document).
- **`Model.insertMany(docs)`**: Inserts multiple documents efficiently in a single operation.
  - *Project Example*: `const insertedQuestions = await Question.insertMany(questionsToInsert);` (Used when importing a batch of questions).
- **`document.save()`**: Saves a specific document instance. Often used after making changes to a retrieved document or when using `new Model()`.
  - *Project Example*: `admin.email = email; await admin.save();`

### 2.2 Read Methods
- **`Model.find(query)`**: Finds all documents matching the query.
  - *Project Example*: `const exams = await Exam.find({})` (Retrieves all exams).
- **`Model.findOne(query)`**: Finds the first document that matches the query.
  - *Project Example*: `const admin = await Admin.findOne({ email });` (Finds an admin by their email).
- **`Model.findById(id)`**: Specifically finds a document by its `_id`.
  - *Project Example*: `const student = await Student.findById(studentId);`
- **`Model.countDocuments(query)`**: Returns the count of documents that match the query.
  - *Project Example*: `const studentCount = await Student.countDocuments();` (Used in the dashboard stats).

### 2.3 Update Methods
- **`Model.findByIdAndUpdate(id, update, options)`**: Finds a document by ID, updates it, and optionally returns the updated document.
  - *Project Example*: `await Exam.findByIdAndUpdate(id, { status, scheduledAt, endsAt }, { new: true });` (`new: true` returns the modified document).
- **`Model.updateMany(query, update)`**: Updates all documents that match the query criteria.
  - *Project Example*: `await AuditLog.updateMany({ _id: { $in: logIds } }, { $set: { isCommitted: true } });`

### 2.4 Delete Methods
- **`Model.findByIdAndDelete(id)`**: Finds a document by its ID and removes it.
  - *Project Example*: `const deletedStudent = await Student.findByIdAndDelete(id);`
- **`Model.findOneAndDelete(query)`**: Finds a document matching the query and deletes it.
  - *Project Example*: `const deletedProfessor = await Professor.findOneAndDelete({ id });`
- **`Model.deleteMany(query)`**: Deletes all documents that match the query.
  - *Project Example*: `await Result.deleteMany({ _id: { $in: resultIds } });`

### 2.5 Query Builders and Modifiers
Mongoose uses chaining to modify queries before executing them.
- **`.populate(path, select)`**: Replaces the specified paths in the document with the document(s) from other collections. This is MongoDB's equivalent to SQL joins.
  - *Project Example*: `Result.find({}).populate("student", "name studentId")` (Replaces the `student` ObjectId with the actual student's `name` and `studentId`).
- **`.sort(criteria)`**: Sorts the result set.
  - *Project Example*: `.sort({ createdAt: -1 })` (Sorts results by descending creation date).
- **`.limit(num)`**: Restricts the maximum number of documents returned.
  - *Project Example*: `.limit(15)`
- **`.skip(num)`**: Skips a specified number of documents (useful for pagination).
  - *Project Example*: `.skip((Number(page) - 1) * Number(limit))`
- **`.select(fields)`**: Specifies which document fields to include or exclude.
  - *Project Example*: `.select("-password")` (Excludes the password field from the query results).
- **`.lean()`**: Tells Mongoose to return raw plain JavaScript objects instead of heavy Mongoose Documents, which improves performance.
  - *Project Example*: `const professors = await Professor.find({}).lean();`

---

## 3. MongoDB Operators Used

Operators in MongoDB provide powerful querying and updating capabilities without needing to write custom application-level filtering logic.

### 3.1 Comparison Operators
- **`$eq`** (Equals): Matches values that are equal to a specified value.
- **`$ne`** (Not Equals): Matches values that are NOT equal to a specified value.
  - *Project Example*: `{ isDeletedByAdmin: { $ne: true } }` (Finds batches that have not been soft-deleted by an admin).
- **`$lt`** (Less Than): Matches values that are strictly less than a specified value.
  - *Project Example*: `{ createdAt: { $lt: new Date(...) } }` (Used to find students created before a certain date).
- **`$gt`** (Greater Than), **`$gte`** (Greater Than or Equals).

### 3.2 Logical Operators
- **`$or`**: Joins query clauses with a logical OR and returns documents that match the conditions of either clause.
  - *Project Example*: `Admin.findOne({ $or: [{ adminId }, { email }] })` (Checks if an admin exists using either ID or Email).
- **`$in`**: Matches any of the values specified in an array.
  - *Project Example*: `{ _id: { $in: logIds } }` (Matches documents where the `_id` is present in the `logIds` array).

### 3.3 Evaluation Operators
- **`$regex`** & **`$options`**: Provides regular expression capabilities for pattern matching strings. (Often used for searching/filtering text fields).
- **`$expr`**: Allows the use of aggregation expressions within the query language.

### 3.4 Update Operators
- **`$set`**: Replaces the value of a field with the specified value.
  - *Project Example*: `{ $set: { isCommitted: true } }`
- **`$push`**: Appends a specified value to an array.

---

## 4. Aggregation Pipeline

MongoDB’s aggregation framework is used for advanced data processing and analytics. It processes data records and returns computed results. It operates on a pipeline model where documents enter a multi-stage pipeline that transforms them.

In this project, aggregation is used for generating dashboard statistics and analytics.

### Example in `admin.controllers.js`: Grouping questions by subject
```javascript
const questionsBySubject = await Question.aggregate([
    { $group: { _id: "$subject", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
]);
```

### Aggregation Pipeline Operators Used:
- **`$group`**: Groups input documents by a specified `_id` expression (in the example above, it groups by the `$subject` field). It can then apply accumulator expressions to each group.
- **`$sum`**: Calculates and returns the collective sum of numeric values. In the example, `{ $sum: 1 }` counts the number of documents in each grouped subject.
- **`$sort`**: Orders the documents (in the example, `{ count: -1 }` sorts descending by the highest count).
- **`$match`**: Filters documents to pass only those that match the specified conditions to the next stage (functions exactly like `.find()` but in an aggregation context).
- **`$cond`**: Evaluates a boolean expression and returns one of two specified expressions depending on the boolean result (Ternary operator).
- **`$divide`**: Divides one number by another.

---

## Conclusion
The project extensively leverages Mongoose for structured interactions with the MongoDB database. It uses schema validation for data integrity, powerful Mongoose query methods (with pagination, sorting, and field selection) for CRUD operations, and advanced MongoDB Aggregation pipelines for compiling complex analytics and metrics.
