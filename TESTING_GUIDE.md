# Administrative Features - Manual Testing Guide

This guide provides step-by-step instructions to manually verify the 5 newly implemented administrative use cases (UC-A06 through UC-A10).

## Prerequisites
Before you begin testing, ensure your local environment is running:
1. Start your local dev servers: `composer dev` (or `php artisan serve` and `npm run dev`).
2. Log into the application using an administrator account. (If you seeded the database, use `test@example.com` or register a new account).

---

## 1. UC-A06: Import Quiz via Scraping
**Goal**: Verify the system can extract questions and answers from an external URL or an uploaded HTML file.

To make testing easier, a dummy file has been placed in your project at `public/dummy-quiz.html`.

**Test File Upload Method:**
1. Navigate to: `/admin/modules/1/quiz/import` (change `1` to an existing module ID).
2. Select **From File (HTML)** under Scrape Options.
3. Upload the file located at `HoTech/public/dummy-quiz.html` from your computer.
4. Click **Scrape Questions**.
5. **Verify**: A preview of 3 questions should appear below. Notice the different confidence score badges (e.g., 90% for radio buttons, 80% for lists).
6. Check the boxes next to the questions and click **Import Selected**. You should be redirected with a success message.

**Test URL Method:**
1. Go back to the import page.
2. Select **From URL**.
3. Assuming your local server is running on port 8000, enter: `http://localhost:8000/dummy-quiz.html`.
4. Click **Scrape Questions**.
5. **Verify**: The exact same 3 questions should be extracted successfully over HTTP.

---

## 2. UC-A07: Learner Analytics
**Goal**: Verify KPI cards and charts render correctly and react to pole filtering.

**Steps:**
1. Navigate to: `/admin/analytics`.
2. **Verify Data**: Check the "Active Students", "Global Completion Rate", and "Quiz Pass Rate" cards. (If the database is fresh, these might read `0` or `0%`).
3. **Verify Charts**: Ensure the Bar Chart (Course Enrollment) and Line Chart (Monthly Enrollments) render cleanly using the Recharts library.
4. **Test Filtering**:
   - Change the dropdown filter at the top right from "All Poles" to "Téléphonie".
   - **Verify**: The browser URL updates to `?pole=telephonie` and the metrics/charts update dynamically without a full page refresh.

*(Tip: To see meaningful charts, you can generate fake data by opening `php artisan tinker` and running `\App\Models\User::factory(10)->create(['role' => 'learner']);`)*

---

## 3. UC-A08: Manage Learner Accounts
**Goal**: Verify the admin can list, search, add, and toggle the status of learners.

**Steps:**
1. Navigate to: `/admin/students`.
2. **Test Listing & Searching**:
   - Ensure the table populates with learner accounts.
   - Type a name or email into the search bar and click **Search**. Verify the table filters properly.
3. **Test Creation**:
   - Click **Add Learner**.
   - Fill in a name and email, and select a pole if prompted. Click Submit.
   - **Verify**: The modal closes, the new user appears, and a success message displays a temporary generated password.
4. **Test Actions**:
   - Click the `...` (More) menu on a student's row.
   - Click **Toggle Status**. Verify the status badge immediately changes between Active (Green) and Inactive (Red).
   - Click **View Details**. Verify it routes to the student's profile showing their enrolled courses and progress bars.

---

## 4. UC-A09: Quiz Pass Threshold Config
**Goal**: Verify the admin can configure the passing percentage for a specific quiz.

**Steps:**
1. Navigate to: `/admin/quizzes/1/edit` (ensure Quiz #1 exists; this is the one you created during the UC-A06 test).
2. **Test Updating**:
   - Locate the **Pass Threshold (%)** slider/input.
   - Drag the slider or type to change the value from `70` to `85`.
   - Click **Save Changes**.
   - **Verify**: A success toast appears. Refresh the page to confirm the `85%` threshold persisted in the database.
3. **Test Validation**:
   - Try manually typing `150` into the number input.
   - Click **Save Changes**.
   - **Verify**: The UI blocks the submission or displays a red validation error stating the maximum allowed is 100.

---

## 5. UC-A10: Manage Certificate Templates
**Goal**: Verify the admin can edit HTML certificate templates, upload logos, and generate a dynamic PDF.

**Steps:**
1. Navigate to: `/admin/certificate-templates`.
2. **Test Listing**: Verify you see template cards for the "Telephonie" and "Energie" poles.
3. **Test Editing & Logo Upload**:
   - Click **Edit Template** on the Telephonie card.
   - Click the file input under **Logo Image** and upload any small image file (PNG/JPG) from your computer. Verify a preview thumbnail appears instantly.
   - In the **Body Text** area, type a certificate string using the provided placeholders, for example: 
     `<h1>Congratulations {student_name}!</h1> <p>You completed {course_title} on {date}.</p>`
   - Click **Save Changes**.
4. **Test PDF Generation**:
   - Click the **Preview PDF** button (top right).
   - **Verify**: A new browser tab opens streaming a generated PDF document. It should display your uploaded logo image at the top, and the text below should have replaced the placeholders with dummy data (e.g., "Congratulations John Doe!").