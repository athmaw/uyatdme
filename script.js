let jsonResult = [];

// Split one CSV row while respecting commas inside quoted values
function parseCSVLine(line) {
    const values = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const character = line[i];

        if (character === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                value += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (character === "," && !insideQuotes) {
            values.push(value);
            value = "";
        } else {
            value += character;
        }
    }

    values.push(value);
    return values;
}

// Capitalize each word/first letter in a name
function capitalizeName(value) {
    return value.trim().toLowerCase()
        .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

// Convert CSV data into transformed JSON based on Data Map specifications
function convertCSV() {
    const fileInput = document.getElementById("csvFile");
    const file = fileInput.files[0];
    const output = document.getElementById("jsonOutput");

    if (!file) {
        output.textContent = "Please upload a CSV file first.";
        return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
        const csvText = event.target.result.replace(/^\uFEFF/, "").trim();

        if (!csvText) {
            output.textContent = "The CSV file is empty.";
            return;
        }

        const lines = csvText.split(/\r?\n/);
        const headers = parseCSVLine(lines[0]).map(h => h.trim());
        const requiredFields = [
            "student_id", "first_name", "last_name", "course",
            "year_level", "email", "tuition_balance"
        ];

        const missingFields = requiredFields.filter(field => !headers.includes(field));

        if (missingFields.length > 0) {
            output.textContent = "Missing CSV column(s): " + missingFields.join(", ");
            return;
        }

        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === "") continue;

            const values = parseCSVLine(lines[i]);
            const row = {};

            headers.forEach((header, index) => {
                row[header] = (values[index] ?? "").trim();
            });

            rows.push(row);
        }

        const programNames = {
            "BSIT": "Bachelor of Science in Information Technology",
            "BSCS": "Bachelor of Science in Computer Science",
            "BSIS": "Bachelor of Science in Information Systems"
        };

        try {
            jsonResult = rows.map((row, index) => {
                const studentId = Number.parseInt(row.student_id, 10);
                const yearLevel = Number.parseInt(row.year_level, 10);
                const rawTuition = Number(row.tuition_balance);
                const courseCode = row.course.trim().toUpperCase();

                if (!Number.isInteger(studentId) ||
                    !Number.isInteger(yearLevel) ||
                    row.tuition_balance === "" ||
                    !Number.isFinite(rawTuition)) {
                    throw new Error("Invalid number in CSV row " + (index + 2));
                }

                if (!programNames[courseCode]) {
                    throw new Error("Unknown course code in CSV row " + (index + 2) +
                        ": " + row.course);
                }

                // Target Data Type: Number, formatted with 2 decimal places precision
                const outstandingBalance = Number(rawTuition.toFixed(2));

                return {
                    studentId: studentId,
                    firstName: capitalizeName(row.first_name),
                    lastName: capitalizeName(row.last_name),
                    program: programNames[courseCode],
                    yearLevel: yearLevel,
                    emailAddress: row.email.trim().toLowerCase(),
                    outstandingBalance: outstandingBalance
                };
            });

            output.textContent = JSON.stringify(jsonResult, null, 4);
        } catch (error) {
            jsonResult = [];
            output.textContent = "Error: " + error.message;
        }
    };

    reader.onerror = function() {
        jsonResult = [];
        output.textContent = "Unable to read the selected CSV file.";
    };

    reader.readAsText(file);
}

// Download transformed JSON file
function downloadJSON() {
    const output = document.getElementById("jsonOutput");

    if (jsonResult.length === 0) {
        output.textContent = "Please upload and convert a valid CSV file first.";
        return;
    }

    const blob = new Blob(
        [JSON.stringify(jsonResult, null, 4)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transformed_students.json";
    link.click();
    URL.revokeObjectURL(url);
}

// Copy JSON result to clipboard
function copyJSON() {
    if (jsonResult.length === 0) return;

    navigator.clipboard.writeText(JSON.stringify(jsonResult, null, 4)).then(() => {
        const feedback = document.getElementById("copyFeedback");
        feedback.classList.add("show");
        setTimeout(() => feedback.classList.remove("show"), 2000);
    });
}

