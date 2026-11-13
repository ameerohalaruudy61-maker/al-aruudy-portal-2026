import { Database } from "jsr:@db/sqlite";

const PORT = 8000;

const db = new Database("school_portal.db");

// ============================================================
// BASIC HELPERS
// ============================================================

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods":
                "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
                "Content-Type, Authorization",
        },
    });
}

function cleanText(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}

async function getBody(request) {
    try {
        return await request.json();
    } catch {
        return {};
    }
}

function generateStudentId() {
    const row = db.prepare(
        `SELECT student_id
         FROM students
         ORDER BY rowid DESC
         LIMIT 1`
    ).get();

    if (!row) {
        return "STU00001";
    }

    const number =
        parseInt(
            String(row.student_id).replace(/\D/g, ""),
            10
        ) || 0;

    return `STU${String(number + 1).padStart(5, "0")}`;
}

function generateTeacherId() {
    const row = db.prepare(
        `SELECT teacher_id
         FROM teachers
         ORDER BY rowid DESC
         LIMIT 1`
    ).get();

    if (!row) {
        return "TCH0001";
    }

    const number =
        parseInt(
            String(row.teacher_id).replace(/\D/g, ""),
            10
        ) || 0;

    return `TCH${String(number + 1).padStart(4, "0")}`;
}

function calculateGrade(total) {
    const score = Number(total) || 0;

    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    if (score >= 40) return "E";

    return "F";
}

function normalizeClass(value) {
    return cleanText(value)
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSubject(value) {
    return cleanText(value)
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================
// DATABASE TABLES
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS students (
        student_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        passport TEXT,
        date_of_birth TEXT,
        gender TEXT,
        student_class TEXT,
        session TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        parent_name TEXT,
        parent_phone TEXT,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teachers (
        teacher_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        student_name TEXT,
        student_class TEXT,
        subject TEXT,
        ca REAL DEFAULT 0,
        exam REAL DEFAULT 0,
        total REAL DEFAULT 0,
        grade TEXT,
        session TEXT,
        term TEXT,
        teacher_remark TEXT,
        principal_remark TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS class_courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_class TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_class, name)
    );

    CREATE TABLE IF NOT EXISTS fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        session TEXT,
        term TEXT,
        fee_type TEXT,
        description TEXT,
        amount REAL DEFAULT 0,
        amount_paid REAL DEFAULT 0,
        status TEXT,
        due_date TEXT,
        receipt_number TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS class_fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_class TEXT UNIQUE NOT NULL,
        amount REAL DEFAULT 0,
        session TEXT,
        term TEXT,
        description TEXT,
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teacher_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        student_class TEXT NOT NULL,
        subject TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        audience TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS timetables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_class TEXT NOT NULL,
        day TEXT,
        period TEXT,
        subject TEXT,
        teacher TEXT,
        start_time TEXT,
        end_time TEXT,
        time TEXT,
        class TEXT,
        timetable_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// ============================================================
// DATABASE MIGRATION
// ============================================================

function addColumnIfMissing(
    tableName,
    columnName,
    definition
) {
    const columns = db.prepare(
        `PRAGMA table_info(${tableName})`
    ).all();

    const exists = columns.some(
        column => column.name === columnName
    );

    if (!exists) {
        db.exec(
            `ALTER TABLE ${tableName}
             ADD COLUMN ${columnName} ${definition}`
        );

        console.log(
            `Added missing column: ${tableName}.${columnName}`
        );
    }
}

// ------------------------------------------------------------
// Class courses
// ------------------------------------------------------------

addColumnIfMissing(
    "class_courses",
    "description",
    "TEXT NOT NULL DEFAULT ''"
);

// ------------------------------------------------------------
// Teacher assignments
// ------------------------------------------------------------

addColumnIfMissing(
    "teacher_assignments",
    "teacher_id",
    "TEXT"
);

addColumnIfMissing(
    "teacher_assignments",
    "teacher_name",
    "TEXT"
);

addColumnIfMissing(
    "teacher_assignments",
    "student_class",
    "TEXT"
);

addColumnIfMissing(
    "teacher_assignments",
    "subject",
    "TEXT"
);

// ------------------------------------------------------------
// Results
// ------------------------------------------------------------

addColumnIfMissing(
    "results",
    "teacher_remark",
    "TEXT"
);

addColumnIfMissing(
    "results",
    "principal_remark",
    "TEXT"
);

// ------------------------------------------------------------
// Timetables
// ------------------------------------------------------------

addColumnIfMissing(
    "timetables",
    "start_time",
    "TEXT"
);

addColumnIfMissing(
    "timetables",
    "end_time",
    "TEXT"
);

addColumnIfMissing(
    "timetables",
    "time",
    "TEXT"
);

addColumnIfMissing(
    "timetables",
    "class",
    "TEXT"
);

addColumnIfMissing(
    "timetables",
    "timetable_data",
    "TEXT"
);

// ============================================================
// DEFAULT ADMIN
// ============================================================

const adminExists = db.prepare(
    `SELECT id
     FROM admins
     WHERE username = ?`
).get("admin");

if (!adminExists) {
    db.prepare(
        `INSERT INTO admins (
            username,
            password
        )
        VALUES (?, ?)`
    ).run(
        "admin",
        "admin123"
    );
}

// ============================================================
// DATABASE STARTUP MESSAGE
// ============================================================

console.log("Students table is ready.");
console.log("Teachers table is ready.");
console.log("Results table is ready.");
console.log("Courses table is ready.");
console.log("Fees table is ready.");
console.log("Class fees table is ready.");
console.log("Teacher assignments table is ready.");
console.log("Announcements table is ready.");
console.log("Timetables table is ready.");
console.log("Admins table is ready.");

console.log("");
console.log("School Portal Backend Starting...");
console.log(`Listening on http://localhost:${PORT}/`);
console.log("");

// ============================================================
// SERVER
// ============================================================

Deno.serve(
    { port: PORT },
    async (request) => {
        const url = new URL(request.url);

        const pathname =
            decodeURIComponent(url.pathname);

        const method =
            request.method.toUpperCase();

        // ====================================================
        // OPTIONS / CORS
        // ====================================================

        if (method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods":
                        "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers":
                        "Content-Type, Authorization",
                },
            });
        }

        try {

            // ==================================================
            // ROOT
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/"
            ) {
                return json({
                    success: true,
                    message:
                        "Al-Aruudy International School backend is working/running.",
                });
            }

            // ==================================================
            // HEALTH CHECK
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/health"
            ) {
                return json({
                    success: true,
                    message:
                        "Backend is healthy.",
                });
            }

            // ==================================================
            // STUDENT REGISTRATION
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/students/register"
            ) {
                const body =
                    await getBody(request);

                const fullName = cleanText(
                    body.fullName ||
                    body.full_name ||
                    body.name
                );

                const passport = cleanText(
                    body.passport ||
                    body.photo
                );

                const dateOfBirth = cleanText(
                    body.dateOfBirth ||
                    body.date_of_birth ||
                    body.dob
                );

                const gender =
                    cleanText(body.gender);

                const studentClass =
                    normalizeClass(
                        body.studentClass ||
                        body.student_class ||
                        body.class
                    );

                const session =
                    cleanText(body.session);

                const email =
                    cleanText(body.email);

                const phone =
                    cleanText(body.phone);

                const address =
                    cleanText(body.address);

                const parentName =
                    cleanText(
                        body.parentName ||
                        body.parent_name
                    );

                const parentPhone =
                    cleanText(
                        body.parentPhone ||
                        body.parent_phone
                    );

                const password =
                    cleanText(body.password);

                if (!fullName || !password) {
                    return json({
                        success: false,
                        message:
                            "Full name and password are required.",
                    }, 400);
                }

                if (email) {
                    const existingEmail =
                        db.prepare(`
                            SELECT student_id
                            FROM students
                            WHERE LOWER(email) = LOWER(?)
                        `).get(email);

                    if (existingEmail) {
                        return json({
                            success: false,
                            message:
                                "A student with this email already exists.",
                        }, 409);
                    }
                }

                const studentId =
                    generateStudentId();

                db.prepare(`
                    INSERT INTO students (
                        student_id,
                        full_name,
                        passport,
                        date_of_birth,
                        gender,
                        student_class,
                        session,
                        email,
                        phone,
                        address,
                        parent_name,
                        parent_phone,
                        password
                    )
                    VALUES (
                        ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?
                    )
                `).run(
                    studentId,
                    fullName,
                    passport,
                    dateOfBirth,
                    gender,
                    studentClass,
                    session,
                    email,
                    phone,
                    address,
                    parentName,
                    parentPhone,
                    password
                );

                console.log(
                    "Student successfully registered."
                );

                console.log(
                    `Student ID: ${studentId}`
                );

                console.log(
                    `Student Name: ${fullName}`
                );

                return json({
                    success: true,
                    message:
                        "Student registration successful.",
                    student: {
                        studentId,
                        fullName,
                        passport,
                        dateOfBirth,
                        gender,
                        studentClass,
                        session,
                        email,
                        phone,
                        address,
                        parentName,
                        parentPhone,
                    },
                }, 201);
            }

            // ==================================================
            // STUDENT LOGIN
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/students/login"
            ) {
                const body =
                    await getBody(request);

                const fullName =
                    cleanText(
                        body.fullName ||
                        body.full_name ||
                        body.name
                    );

                const password =
                    cleanText(body.password);

                if (!fullName || !password) {
                    return json({
                        success: false,
                        message:
                            "Full name and password are required.",
                    }, 400);
                }

                const student =
                    db.prepare(`
                        SELECT *
                        FROM students
                        WHERE LOWER(full_name) = LOWER(?)
                        AND password = ?
                    `).get(
                        fullName,
                        password
                    );

                if (!student) {
                    return json({
                        success: false,
                        message:
                            "Invalid student name or password.",
                    }, 401);
                }

                console.log(
                    "Student successful: login"
                );

                console.log(
                    `Student ID: ${student.student_id}`
                );

                console.log(
                    `Student Name: ${student.full_name}`
                );

                return json({
                    success: true,
                    message:
                        "Student login successful.",
                    student: {
                        studentId:
                            student.student_id,
                        fullName:
                            student.full_name,
                        passport:
                            student.passport,
                        dateOfBirth:
                            student.date_of_birth,
                        gender:
                            student.gender,
                        studentClass:
                            student.student_class,
                        session:
                            student.session,
                        email:
                            student.email,
                        phone:
                            student.phone,
                        address:
                            student.address,
                        parentName:
                            student.parent_name,
                        parentPhone:
                            student.parent_phone,
                    },
                });
            }

            // ==================================================
            // STUDENT FORGOT PASSWORD
            // ==================================================

            if (
                method === "POST" &&
                pathname ===
                    "/students/forgot-password"
            ) {
                const body =
                    await getBody(request);

                const fullName =
                    cleanText(
                        body.fullName ||
                        body.full_name ||
                        body.name
                    );

                const email =
                    cleanText(body.email);

                const newPassword =
                    cleanText(
                        body.newPassword ||
                        body.new_password ||
                        body.password
                    );

                const confirmPassword =
                    cleanText(
                        body.confirmPassword ||
                        body.confirm_password
                    );

                if (
                    !fullName ||
                    !email ||
                    !newPassword ||
                    !confirmPassword
                ) {
                    return json({
                        success: false,
                        message:
                            "Full name, email, new password and confirm password are required.",
                    }, 400);
                }

                if (
                    newPassword !==
                    confirmPassword
                ) {
                    return json({
                        success: false,
                        message:
                            "Passwords do not match.",
                    }, 400);
                }

                const student =
                    db.prepare(`
                        SELECT student_id
                        FROM students
                        WHERE LOWER(full_name) = LOWER(?)
                        AND LOWER(email) = LOWER(?)
                    `).get(
                        fullName,
                        email
                    );

                if (!student) {
                    return json({
                        success: false,
                        message:
                            "Student name and email could not be verified.",
                    }, 404);
                }

                db.prepare(`
                    UPDATE students
                    SET password = ?
                    WHERE student_id = ?
                `).run(
                    newPassword,
                    student.student_id
                );

                return json({
                    success: true,
                    message:
                        "Student password reset successfully.",
                });
            }

            // ==================================================
            // STUDENT RESET PASSWORD
            // ==================================================

            if (
                method === "PUT" &&
                pathname ===
                    "/students/reset-password"
            ) {
                const body =
                    await getBody(request);

                const studentId =
                    cleanText(
                        body.studentId ||
                        body.student_id
                    );

                const newPassword =
                    cleanText(
                        body.newPassword ||
                        body.new_password ||
                        body.password
                    );

                if (
                    !studentId ||
                    !newPassword
                ) {
                    return json({
                        success: false,
                        message:
                            "Student ID and new password are required.",
                    }, 400);
                }

                const student =
                    db.prepare(`
                        SELECT student_id
                        FROM students
                        WHERE student_id = ?
                    `).get(studentId);

                if (!student) {
                    return json({
                        success: false,
                        message:
                            "Student not found.",
                    }, 404);
                }

                db.prepare(`
                    UPDATE students
                    SET password = ?
                    WHERE student_id = ?
                `).run(
                    newPassword,
                    studentId
                );

                return json({
                    success: true,
                    message:
                        "Student password reset successfully.",
                });
            }

            // ==================================================
            // GET ALL STUDENTS
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/students"
            ) {
                const students =
                    db.prepare(`
                        SELECT
                            student_id AS studentId,
                            full_name AS fullName,
                            passport,
                            date_of_birth AS dateOfBirth,
                            gender,
                            student_class AS studentClass,
                            session,
                            email,
                            phone,
                            address,
                            parent_name AS parentName,
                            parent_phone AS parentPhone,
                            created_at AS createdAt
                        FROM students
                        ORDER BY full_name ASC
                    `).all();

                return json({
                    success: true,
                    students,
                });
            }

            // ==================================================
            // GET SINGLE STUDENT
            // ==================================================

            const studentMatch =
                pathname.match(
                    /^\/students\/([^/]+)$/
                );

            if (
                method === "GET" &&
                studentMatch
            ) {
                const studentId =
                    cleanText(
                        studentMatch[1]
                    );

                const student =
                    db.prepare(`
                        SELECT
                            student_id AS studentId,
                            full_name AS fullName,
                            passport,
                            date_of_birth AS dateOfBirth,
                            gender,
                            student_class AS studentClass,
                            session,
                            email,
                            phone,
                            address,
                            parent_name AS parentName,
                            parent_phone AS parentPhone,
                            created_at AS createdAt
                        FROM students
                        WHERE student_id = ?
                    `).get(studentId);

                if (!student) {
                    return json({
                        success: false,
                        message:
                            "Student not found.",
                    }, 404);
                }

                return json({
                    success: true,
                    student,
                });
            }

            // ==================================================
            // TEACHER REGISTRATION
            // ==================================================

            if (
                method === "POST" &&
                pathname ===
                    "/teachers/register"
            ) {
                const body =
                    await getBody(request);

                const fullName =
                    cleanText(
                        body.fullName ||
                        body.full_name ||
                        body.name
                    );

                const email =
                    cleanText(body.email);

                const password =
                    cleanText(body.password);

                if (
                    !fullName ||
                    !email ||
                    !password
                ) {
                    return json({
                        success: false,
                        message:
                            "Full name, email and password are required.",
                    }, 400);
                }

                const existingEmail =
                    db.prepare(`
                        SELECT teacher_id
                        FROM teachers
                        WHERE LOWER(email) = LOWER(?)
                    `).get(email);

                if (existingEmail) {
                    return json({
                        success: false,
                        message:
                            "A teacher with this email already exists.",
                    }, 409);
                }

                const teacherId =
                    generateTeacherId();

                db.prepare(`
                    INSERT INTO teachers (
                        teacher_id,
                        full_name,
                        email,
                        password
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    teacherId,
                    fullName,
                    email,
                    password
                );

                console.log(
                    "Teacher successfully registered."
                );

                console.log(
                    `Teacher ID: ${teacherId}`
                );

                console.log(
                    `Teacher Name: ${fullName}`
                );

                return json({
                    success: true,
                    message:
                        "Teacher registration successful.",
                    teacher: {
                        teacherId,
                        fullName,
                        email,
                    },
                }, 201);
            }

            // ==================================================
            // TEACHER LOGIN
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/teachers/login"
            ) {
                const body =
                    await getBody(request);

                const fullName =
                    cleanText(
                        body.fullName ||
                        body.full_name ||
                        body.name
                    );

                const password =
                    cleanText(body.password);

                if (
                    !fullName ||
                    !password
                ) {
                    return json({
                        success: false,
                        message:
                            "Full name and password are required.",
                    }, 400);
                }

                const teacher =
                    db.prepare(`
                        SELECT *
                        FROM teachers
                        WHERE LOWER(full_name) = LOWER(?)
                        AND password = ?
                    `).get(
                        fullName,
                        password
                    );

                if (!teacher) {
                    return json({
                        success: false,
                        message:
                            "Invalid teacher name or password.",
                    }, 401);
                }

                console.log(
                    "Teacher successful: login"
                );

                console.log(
                    `Teacher ID: ${teacher.teacher_id}`
                );

                console.log(
                    `Teacher Name: ${teacher.full_name}`
                );

                return json({
                    success: true,
                    message:
                        "Teacher login successful.",
                    teacher: {
                        teacherId:
                            teacher.teacher_id,
                        fullName:
                            teacher.full_name,
                        email:
                            teacher.email,
                    },
                });
            }

            // ==================================================
            // TEACHER FORGOT PASSWORD
            // ==================================================

            if (
                method === "POST" &&
                pathname ===
                    "/teachers/forgot-password"
            ) {
                const body =
                    await getBody(request);

                const fullName =
                    cleanText(
                        body.fullName ||
                        body.full_name ||
                        body.name
                    );

                const email =
                    cleanText(body.email);

                const newPassword =
                    cleanText(
                        body.newPassword ||
                        body.new_password ||
                        body.password
                    );

                const confirmPassword =
                    cleanText(
                        body.confirmPassword ||
                        body.confirm_password
                    );

                if (
                    !fullName ||
                    !email ||
                    !newPassword ||
                    !confirmPassword
                ) {
                    return json({
                        success: false,
                        message:
                            "Full name, email, new password and confirm password are required.",
                    }, 400);
                }

                if (
                    newPassword !==
                    confirmPassword
                ) {
                    return json({
                        success: false,
                        message:
                            "Passwords do not match.",
                    }, 400);
                }

                const teacher =
                    db.prepare(`
                        SELECT teacher_id
                        FROM teachers
                        WHERE LOWER(full_name) = LOWER(?)
                        AND LOWER(email) = LOWER(?)
                    `).get(
                        fullName,
                        email
                    );

                if (!teacher) {
                    return json({
                        success: false,
                        message:
                            "Teacher name and email could not be verified.",
                    }, 404);
                }

                db.prepare(`
                    UPDATE teachers
                    SET password = ?
                    WHERE teacher_id = ?
                `).run(
                    newPassword,
                    teacher.teacher_id
                );

                return json({
                    success: true,
                    message:
                        "Teacher password reset successfully.",
                });
            }

            // ==================================================
            // GET ALL TEACHERS
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/teachers"
            ) {
                const teachers =
                    db.prepare(`
                        SELECT
                            teacher_id AS teacherId,
                            full_name AS fullName,
                            email,
                            created_at AS createdAt
                        FROM teachers
                        ORDER BY full_name ASC
                    `).all();

                return json({
                    success: true,
                    teachers,
                });
            }

            // ==================================================
            // GET SINGLE TEACHER
            // ==================================================

            const teacherMatch =
                pathname.match(
                    /^\/teachers\/([^/]+)$/
                );

            if (
                method === "GET" &&
                teacherMatch
            ) {
                const teacherId =
                    cleanText(
                        teacherMatch[1]
                    );

                const teacher =
                    db.prepare(`
                        SELECT
                            teacher_id AS teacherId,
                            full_name AS fullName,
                            email,
                            created_at AS createdAt
                        FROM teachers
                        WHERE teacher_id = ?
                    `).get(teacherId);

                if (!teacher) {
                    return json({
                        success: false,
                        message:
                            "Teacher not found.",
                    }, 404);
                }

                return json({
                    success: true,
                    teacher,
                });
            }

            // ==================================================
            // COURSES - GET ALL
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/courses"
            ) {
                const courses =
                    db.prepare(`
                        SELECT
                            id,
                            student_class AS studentClass,
                            name,
                            description,
                            created_at AS createdAt
                        FROM class_courses
                        ORDER BY
                            student_class ASC,
                            name ASC
                    `).all();

                return json({
                    success: true,
                    courses,
                });
            }

            // ==================================================
            // COURSES - GET BY CLASS
            // ==================================================

            const courseClassMatch =
                pathname.match(
                    /^\/courses\/(.+)$/
                );

            if (
                method === "GET" &&
                courseClassMatch
            ) {
                const studentClass =
                    normalizeClass(
                        courseClassMatch[1]
                    );

                const courses =
                    db.prepare(`
                        SELECT
                            id,
                            student_class AS studentClass,
                            name,
                            description,
                            created_at AS createdAt
                        FROM class_courses
                        WHERE LOWER(student_class) = LOWER(?)
                        ORDER BY name ASC
                    `).all(studentClass);

                return json({
                    success: true,
                    studentClass,
                    courses,
                });
            }

            // ==================================================
            // COURSES - ADD
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/courses"
            ) {
                const body =
                    await getBody(request);

                const studentClass =
                    normalizeClass(
                        body.studentClass ||
                        body.student_class ||
                        body.class
                    );

                const name =
                    normalizeSubject(
                        body.name ||
                        body.course ||
                        body.subject
                    );

                const description =
                    cleanText(
                        body.description
                    );

                if (
                    !studentClass ||
                    !name
                ) {
                    return json({
                        success: false,
                        message:
                            "Class and course name are required.",
                    }, 400);
                }

                const existing =
                    db.prepare(`
                        SELECT id
                        FROM class_courses
                        WHERE LOWER(student_class) = LOWER(?)
                        AND LOWER(name) = LOWER(?)
                    `).get(
                        studentClass,
                        name
                    );

                if (existing) {
                    return json({
                        success: false,
                        message:
                            "This course already exists for this class.",
                    }, 409);
                }

                const result =
                    db.prepare(`
                        INSERT INTO class_courses (
                            student_class,
                            name,
                            description
                        )
                        VALUES (?, ?, ?)
                    `).run(
                        studentClass,
                        name,
                        description
                    );

                console.log("");
                console.log(
                    "Course added successfully."
                );
                console.log(
                    `Class: ${studentClass}`
                );
                console.log(
                    `Course: ${name}`
                );

                return json({
                    success: true,
                    message:
                        "Course added successfully.",
                    course: {
                        id:
                            result.lastInsertRowid,
                        studentClass,
                        name,
                        description,
                    },
                }, 201);
            }

            // ==================================================
            // COURSES - DELETE
            // ==================================================

            const courseIdMatch =
                pathname.match(
                    /^\/courses\/(\d+)$/
                );

            if (
                method === "DELETE" &&
                courseIdMatch
            ) {
                const id =
                    Number(
                        courseIdMatch[1]
                    );

                const existing =
                    db.prepare(`
                        SELECT id
                        FROM class_courses
                        WHERE id = ?
                    `).get(id);

                if (!existing) {
                    return json({
                        success: false,
                        message:
                            "Course not found.",
                    }, 404);
                }

                db.prepare(`
                    DELETE FROM class_courses
                    WHERE id = ?
                `).run(id);

                console.log(
                    `Course ${id} deleted.`
                );

                return json({
                    success: true,
                    message:
                        "Course deleted successfully.",
                });
            }

            // ==================================================
            // TEACHER ASSIGNMENTS - GET ALL
            // ==================================================

            if (
                method === "GET" &&
                pathname ===
                    "/teacher-assignments"
            ) {
                const assignments =
                    db.prepare(`
                        SELECT
                            id,
                            teacher_id AS teacherId,
                            teacher_name AS teacherName,
                            student_class AS studentClass,
                            subject,
                            created_at AS createdAt
                        FROM teacher_assignments
                        ORDER BY
                            teacher_name ASC,
                            student_class ASC,
                            subject ASC
                    `).all();

                return json({
                    success: true,
                    assignments,
                });
            }

            // ==================================================
            // TEACHER ASSIGNMENTS - ADD
            // ==================================================

            if (
                method === "POST" &&
                pathname ===
                    "/teacher-assignments"
            ) {
                const body =
                    await getBody(request);

                let teacherId =
                    cleanText(
                        body.teacherId ||
                        body.teacher_id ||
                        body.id
                    );

                let teacherName =
                    cleanText(
                        body.teacherName ||
                        body.teacher_name ||
                        body.name
                    );

                const studentClass =
                    normalizeClass(
                        body.studentClass ||
                        body.student_class ||
                        body.class
                    );

                const subject =
                    normalizeSubject(
                        body.subject ||
                        body.course ||
                        body.courseName ||
                        body.course_name
                    );

                // ------------------------------------------------
                // Find teacher ID from teacher name
                // ------------------------------------------------

                if (
                    !teacherId &&
                    teacherName
                ) {
                    const foundTeacher =
                        db.prepare(`
                            SELECT
                                teacher_id,
                                full_name
                            FROM teachers
                            WHERE LOWER(full_name) = LOWER(?)
                            LIMIT 1
                        `).get(
                            teacherName
                        );

                    if (foundTeacher) {
                        teacherId =
                            foundTeacher.teacher_id;

                        teacherName =
                            foundTeacher.full_name;
                    }
                }

                // ------------------------------------------------
                // Find teacher name from teacher ID
                // ------------------------------------------------

                if (
                    teacherId &&
                    !teacherName
                ) {
                    const foundTeacher =
                        db.prepare(`
                            SELECT
                                teacher_id,
                                full_name
                            FROM teachers
                            WHERE teacher_id = ?
                            LIMIT 1
                        `).get(
                            teacherId
                        );

                    if (foundTeacher) {
                        teacherName =
                            foundTeacher.full_name;
                    }
                }

                console.log("");
                console.log(
                    "Teacher assignment request received."
                );

                console.log(
                    `Teacher ID: ${teacherId || "(empty)"}`
                );

                console.log(
                    `Teacher Name: ${teacherName || "(empty)"}`
                );

                console.log(
                    `Class: ${studentClass || "(empty)"}`
                );

                console.log(
                    `Subject: ${subject || "(empty)"}`
                );

                if (
                    !teacherId ||
                    !teacherName ||
                    !studentClass ||
                    !subject
                ) {
                    return json({
                        success: false,
                        message:
                            "Missing teacher assignment information.",
                        missing: {
                            teacherId:
                                !teacherId,
                            teacherName:
                                !teacherName,
                            studentClass:
                                !studentClass,
                            subject:
                                !subject,
                        },
                        received: {
                            teacherId,
                            teacherName,
                            studentClass,
                            subject,
                        },
                    }, 400);
                }

                // ------------------------------------------------
                // Verify teacher exists
                // ------------------------------------------------

                const teacher =
                    db.prepare(`
                        SELECT
                            teacher_id,
                            full_name,
                            email
                        FROM teachers
                        WHERE teacher_id = ?
                    `).get(teacherId);

                if (!teacher) {
                    return json({
                        success: false,
                        message:
                            "Teacher does not exist.",
                    }, 404);
                }

                teacherName =
                    teacher.full_name;

                // ------------------------------------------------
                // Verify course belongs to class
                // ------------------------------------------------

                const course =
                    db.prepare(`
                        SELECT
                            id,
                            name
                        FROM class_courses
                        WHERE LOWER(student_class) = LOWER(?)
                        AND LOWER(name) = LOWER(?)
                        LIMIT 1
                    `).get(
                        studentClass,
                        subject
                    );

                if (!course) {
                    return json({
                        success: false,
                        message:
                            `The subject "${subject}" is not available for ${studentClass}.`,
                        studentClass,
                        subject,
                    }, 404);
                }

                // ------------------------------------------------
                // Prevent duplicate assignment
                // ------------------------------------------------

                const duplicate =
                    db.prepare(`
                        SELECT id
                        FROM teacher_assignments
                        WHERE teacher_id = ?
                        AND LOWER(student_class) = LOWER(?)
                        AND LOWER(subject) = LOWER(?)
                    `).get(
                        teacherId,
                        studentClass,
                        subject
                    );

                if (duplicate) {
                    return json({
                        success: false,
                        message:
                            "This teacher is already assigned to this subject and class.",
                        assignmentId:
                            duplicate.id,
                    }, 409);
                }

                // ------------------------------------------------
                // Create assignment
                // ------------------------------------------------

                const result =
                    db.prepare(`
                        INSERT INTO teacher_assignments (
                            teacher_id,
                            teacher_name,
                            student_class,
                            subject
                        )
                        VALUES (?, ?, ?, ?)
                    `).run(
                        teacherId,
                        teacherName,
                        studentClass,
                        course.name
                    );

                console.log(
                    "Teacher assignment created successfully."
                );

                console.log(
                    `Teacher ID: ${teacherId}`
                );

                console.log(
                    `Teacher Name: ${teacherName}`
                );

                console.log(
                    `Class: ${studentClass}`
                );

                console.log(
                    `Subject: ${course.name}`
                );

                return json({
                    success: true,
                    message:
                        "Teacher assignment created successfully.",
                    assignment: {
                        id:
                            result.lastInsertRowid,
                        teacherId,
                        teacherName,
                        studentClass,
                        subject:
                            course.name,
                    },
                }, 201);
            }

            // ==================================================
            // DELETE TEACHER ASSIGNMENT
            // ==================================================

            const assignmentMatch =
                pathname.match(
                    /^\/teacher-assignments\/(\d+)$/
                );

            if (
                method === "DELETE" &&
                assignmentMatch
            ) {
                const id =
                    Number(
                        assignmentMatch[1]
                    );

                const assignment =
                    db.prepare(`
                        SELECT id
                        FROM teacher_assignments
                        WHERE id = ?
                    `).get(id);

                if (!assignment) {
                    return json({
                        success: false,
                        message:
                            "Teacher assignment not found.",
                    }, 404);
                }

                db.prepare(`
                    DELETE FROM teacher_assignments
                    WHERE id = ?
                `).run(id);

                console.log(
                    `Teacher assignment ${id} deleted.`
                );

                return json({
                    success: true,
                    message:
                        "Teacher assignment removed successfully.",
                });
            }

            // ==================================================
            // RESULTS - GET ALL
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/results"
            ) {
                const results =
                    db.prepare(`
                        SELECT *
                        FROM results
                        ORDER BY
                            student_name ASC,
                            subject ASC
                    `).all();

                return json({
                    success: true,
                    results,
                });
            }

            // ==================================================
            // RESULTS - GET BY STUDENT
            // ==================================================

            const resultStudentMatch =
                pathname.match(
                    /^\/results\/student\/([^/]+)$/
                );

            if (
                method === "GET" &&
                resultStudentMatch
            ) {
                const studentId =
                    cleanText(
                        resultStudentMatch[1]
                    );

                const results =
                    db.prepare(`
                        SELECT *
                        FROM results
                        WHERE student_id = ?
                        ORDER BY subject ASC
                    `).all(studentId);

                return json({
                    success: true,
                    studentId,
                    results,
                });
            }

            // ==================================================
            // ADD RESULT
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/results"
            ) {
                const body =
                    await getBody(request);

                const studentId =
                    cleanText(
                        body.studentId ||
                        body.student_id
                    );

                const studentName =
                    cleanText(
                        body.studentName ||
                        body.student_name ||
                        body.name
                    );

                const studentClass =
                    normalizeClass(
                        body.studentClass ||
                        body.student_class ||
                        body.class
                    );

                const subject =
                    normalizeSubject(
                        body.subject ||
                        body.course
                    );

                const ca =
                    Number(
                        body.ca ||
                        body.continuousAssessment ||
                        body.continuous_assessment ||
                        0
                    );

                const exam =
                    Number(
                        body.exam ||
                        body.examScore ||
                        body.exam_score ||
                        0
                    );

                const total =
                    body.total !== undefined
                        ? Number(body.total)
                        : ca + exam;

                const grade =
                    calculateGrade(total);

                const session =
                    cleanText(body.session);

                const term =
                    cleanText(body.term);

                const teacherRemark =
                    cleanText(
                        body.teacherRemark ||
                        body.teacher_remark
                    );

                const principalRemark =
                    cleanText(
                        body.principalRemark ||
                        body.principal_remark
                    );

                if (
                    !studentId &&
                    !studentName
                ) {
                    return json({
                        success: false,
                        message:
                            "Student ID or student name is required.",
                    }, 400);
                }

                if (!subject) {
                    return json({
                        success: false,
                        message:
                            "Subject is required.",
                    }, 400);
                }

                const result =
                    db.prepare(`
                        INSERT INTO results (
                            student_id,
                            student_name,
                            student_class,
                            subject,
                            ca,
                            exam,
                            total,
                            grade,
                            session,
                            term,
                            teacher_remark,
                            principal_remark
                        )
                        VALUES (
                            ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?
                        )
                    `).run(
                        studentId,
                        studentName,
                        studentClass,
                        subject,
                        ca,
                        exam,
                        total,
                        grade,
                        session,
                        term,
                        teacherRemark,
                        principalRemark
                    );

                return json({
                    success: true,
                    message:
                        "Result added successfully.",
                    result: {
                        id:
                            result.lastInsertRowid,
                        studentId,
                        studentName,
                        studentClass,
                        subject,
                        ca,
                        exam,
                        total,
                        grade,
                        session,
                        term,
                        teacherRemark,
                        principalRemark,
                    },
                }, 201);
            }

            // ==================================================
            // FEES - GET ALL
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/fees"
            ) {
                const fees =
                    db.prepare(`
                        SELECT *
                        FROM fees
                        ORDER BY created_at DESC
                    `).all();

                return json({
                    success: true,
                    fees,
                });
            }

            // ==================================================
            // FEES - GET BY STUDENT
            // ==================================================

            const feeStudentMatch =
                pathname.match(
                    /^\/fees\/student\/([^/]+)$/
                );

            if (
                method === "GET" &&
                feeStudentMatch
            ) {
                const studentId =
                    cleanText(
                        feeStudentMatch[1]
                    );

                const fees =
                    db.prepare(`
                        SELECT *
                        FROM fees
                        WHERE student_id = ?
                        ORDER BY created_at DESC
                    `).all(studentId);

                return json({
                    success: true,
                    studentId,
                    fees,
                });
            }

            // ==================================================
            // ADD FEE
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/fees"
            ) {
                const body =
                    await getBody(request);

                const studentId =
                    cleanText(
                        body.studentId ||
                        body.student_id
                    );

                const session =
                    cleanText(body.session);

                const term =
                    cleanText(body.term);

                const feeType =
                    cleanText(
                        body.feeType ||
                        body.fee_type
                    );

                const description =
                    cleanText(
                        body.description
                    );

                const amount =
                    Number(body.amount || 0);

                const amountPaid =
                    Number(
                        body.amountPaid ||
                        body.amount_paid ||
                        0
                    );

                const dueDate =
                    cleanText(
                        body.dueDate ||
                        body.due_date
                    );

                const receiptNumber =
                    cleanText(
                        body.receiptNumber ||
                        body.receipt_number
                    );

                let status =
                    cleanText(body.status);

                if (!status) {
                    if (
                        amountPaid >= amount
                    ) {
                        status = "Paid";
                    } else if (
                        amountPaid > 0
                    ) {
                        status = "Partially Paid";
                    } else {
                        status = "Unpaid";
                    }
                }

                const result =
                    db.prepare(`
                        INSERT INTO fees (
                            student_id,
                            session,
                            term,
                            fee_type,
                            description,
                            amount,
                            amount_paid,
                            status,
                            due_date,
                            receipt_number
                        )
                        VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?
                        )
                    `).run(
                        studentId,
                        session,
                        term,
                        feeType,
                        description,
                        amount,
                        amountPaid,
                        status,
                        dueDate,
                        receiptNumber
                    );

                return json({
                    success: true,
                    message:
                        "Fee added successfully.",
                    feeId:
                        result.lastInsertRowid,
                }, 201);
            }

            // ==================================================
            // CLASS FEES - GET ALL
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/class-fees"
            ) {
                const classFees =
                    db.prepare(`
                        SELECT *
                        FROM class_fees
                        ORDER BY student_class ASC
                    `).all();

                return json({
                    success: true,
                    classFees,
                });
            }

            // ==================================================
            // CLASS FEES - ADD / UPDATE
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/class-fees"
            ) {
                const body =
                    await getBody(request);

                const studentClass =
                    normalizeClass(
                        body.studentClass ||
                        body.student_class ||
                        body.class
                    );

                const amount =
                    Number(body.amount || 0);

                const session =
                    cleanText(body.session);

                const term =
                    cleanText(body.term);

                const description =
                    cleanText(
                        body.description
                    );

                const dueDate =
                    cleanText(
                        body.dueDate ||
                        body.due_date
                    );

                if (!studentClass) {
                    return json({
                        success: false,
                        message:
                            "Class is required.",
                    }, 400);
                }

                const existing =
                    db.prepare(`
                        SELECT id
                        FROM class_fees
                        WHERE LOWER(student_class) = LOWER(?)
                    `).get(studentClass);

                if (existing) {
                    db.prepare(`
                        UPDATE class_fees
                        SET
                            amount = ?,
                            session = ?,
                            term = ?,
                            description = ?,
                            due_date = ?
                        WHERE id = ?
                    `).run(
                        amount,
                        session,
                        term,
                        description,
                        dueDate,
                        existing.id
                    );

                    return json({
                        success: true,
                        message:
                            "Class fee updated successfully.",
                    });
                }

                const result =
                    db.prepare(`
                        INSERT INTO class_fees (
                            student_class,
                            amount,
                            session,
                            term,
                            description,
                            due_date
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(
                        studentClass,
                        amount,
                        session,
                        term,
                        description,
                        dueDate
                    );

                return json({
                    success: true,
                    message:
                        "Class fee added successfully.",
                    id:
                        result.lastInsertRowid,
                }, 201);
            }

            // ==================================================
            // ANNOUNCEMENTS - GET
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/announcements"
            ) {
                const announcements =
                    db.prepare(`
                        SELECT
                            id,
                            title,
                            message,
                            audience,
                            created_at AS createdAt
                        FROM announcements
                        ORDER BY created_at DESC
                    `).all();

                return json({
                    success: true,
                    announcements,
                });
            }

            // ==================================================
            // ANNOUNCEMENTS - ADD
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/announcements"
            ) {
                const body =
                    await getBody(request);

                const title =
                    cleanText(body.title);

                const message =
                    cleanText(body.message);

                const audience =
                    cleanText(
                        body.audience
                    ) || "All";

                if (
                    !title ||
                    !message
                ) {
                    return json({
                        success: false,
                        message:
                            "Title and message are required.",
                    }, 400);
                }

                const result =
                    db.prepare(`
                        INSERT INTO announcements (
                            title,
                            message,
                            audience
                        )
                        VALUES (?, ?, ?)
                    `).run(
                        title,
                        message,
                        audience
                    );

                return json({
                    success: true,
                    message:
                        "Announcement created successfully.",
                    announcementId:
                        result.lastInsertRowid,
                }, 201);
            }

            // ==================================================
            // DELETE ANNOUNCEMENT
            // ==================================================

            const announcementMatch =
                pathname.match(
                    /^\/announcements\/(\d+)$/
                );

            if (
                method === "DELETE" &&
                announcementMatch
            ) {
                const id =
                    Number(
                        announcementMatch[1]
                    );

                db.prepare(`
                    DELETE FROM announcements
                    WHERE id = ?
                `).run(id);

                return json({
                    success: true,
                    message:
                        "Announcement deleted successfully.",
                });
            }

            // ==================================================
            // TIMETABLE - GET ALL
            // ==================================================

            if (
                method === "GET" &&
                pathname === "/timetables"
            ) {
                const timetables =
                    db.prepare(`
                        SELECT *
                        FROM timetables
                        ORDER BY
                            student_class ASC,
                            day ASC,
                            period ASC
                    `).all();

                return json({
                    success: true,
                    timetables,
                });
            }

            // ==================================================
            // TIMETABLE - GET BY CLASS
            // ==================================================

            const timetableClassMatch =
                pathname.match(
                    /^\/timetables\/(.+)$/
                );

            if (
                method === "GET" &&
                timetableClassMatch
            ) {
                const studentClass =
                    normalizeClass(
                        timetableClassMatch[1]
                    );

                const timetables =
                    db.prepare(`
                        SELECT *
                        FROM timetables
                        WHERE LOWER(student_class) = LOWER(?)
                        ORDER BY
                            day ASC,
                            period ASC
                    `).all(studentClass);

                return json({
                    success: true,
                    studentClass,
                    timetables,
                });
            }

            // ==================================================
            // ADD TIMETABLE
            // ==================================================

            if (
                method === "POST" &&
                pathname === "/timetables"
            ) {
                const body =
                    await getBody(request);

                const studentClass =
                    normalizeClass(
                        body.studentClass ||
                        body.student_class ||
                        body.class
                    );

                const day =
                    cleanText(body.day);

                const period =
                    cleanText(body.period);

                const subject =
                    cleanText(body.subject);

                const teacher =
                    cleanText(body.teacher);

                const startTime =
                    cleanText(
                        body.startTime ||
                        body.start_time
                    );

                const endTime =
                    cleanText(
                        body.endTime ||
                        body.end_time
                    );

                const time =
                    cleanText(body.time);

                const timetableSource =
                    body.timetableData ||
                    body.timetable_data;

                const timetableData =
                    timetableSource
                        ? JSON.stringify(
                            timetableSource
                        )
                        : "";

                if (!studentClass) {
                    return json({
                        success: false,
                        message:
                            "Class is required.",
                    }, 400);
                }

                const result =
                    db.prepare(`
                        INSERT INTO timetables (
                            student_class,
                            day,
                            period,
                            subject,
                            teacher,
                            start_time,
                            end_time,
                            time,
                            class,
                            timetable_data
                        )
                        VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?
                        )
                    `).run(
                        studentClass,
                        day,
                        period,
                        subject,
                        teacher,
                        startTime,
                        endTime,
                        time,
                        studentClass,
                        timetableData
                    );

                return json({
                    success: true,
                    message:
                        "Timetable added successfully.",
                    timetableId:
                        result.lastInsertRowid,
                }, 201);
            }

            // ==================================================
            // DELETE TIMETABLE
            // ==================================================

            const timetableMatch =
                pathname.match(
                    /^\/timetables\/(\d+)$/
                );

            if (
                method === "DELETE" &&
                timetableMatch
            ) {
                const id =
                    Number(
                        timetableMatch[1]
                    );

                db.prepare(`
                    DELETE FROM timetables
                    WHERE id = ?
                `).run(id);

                return json({
                    success: true,
                    message:
                        "Timetable deleted successfully.",
                });
            }

            // ==================================================
            // ADMIN LOGIN
            // ==================================================
if (
    method === "POST" &&
    (
        pathname === "/admin/login" ||
        pathname === "/admins/login"
    )
) {
    const body =
        await getBody(request);

    const username =
        cleanText(
            body.username ||
            body.userName
        );

    const password =
        cleanText(body.password);

    if (
        !username ||
        !password
    ) {
        return json({
            success: false,
            message:
                "Username and password are required.",
        }, 400);
                }

                const admin =
                    db.prepare(`
                        SELECT
                            id,
                            username
                        FROM admins
                        WHERE username = ?
                        AND password = ?
                    `).get(
                        username,
                        password
                    );

                if (!admin) {
                    return json({
                        success: false,
                        message:
                            "Invalid admin username or password.",
                    }, 401);
                }

                console.log(
                    "Admin successful: login"
                );

                console.log(
                    `Admin Username: ${admin.username}`
                );

                return json({
                    success: true,
                    message:
                        "Admin login successful.",
                    admin: {
                        id: admin.id,
                        username:
                            admin.username,
                    },
                });
            }

            // ==================================================
            // 404
            // ==================================================

            return json({
                success: false,
                message:
                    `Route not found: ${method} ${pathname}`,
            }, 404);

        } catch (error) {

            console.error("");
            console.error("SERVER ERROR:");
            console.error(error);

            return json({
                success: false,
                message:
                    "An internal server error occurred.",
                error:
                    error.message,
            }, 500);
        }
    }
);