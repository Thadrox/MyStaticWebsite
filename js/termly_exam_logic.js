// Remove the large examQuestions object from here.
// Questions will now be loaded dynamically from JSON files.

let currentExamQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft;
const MAX_ATTEMPTS = 2; // <<< CONTROL YOUR SOFT LIMIT HERE

let studentInfo = {
    name: "",
    school: "",
    class: "",
    subject: "",
    term: ""
};
let userAnswers = {}; // To store user's selected answers for each question index

// --- DOM Elements ---
const examSetupSection = document.getElementById('exam-setup');
const examContentSection = document.getElementById('exam-content');
const examResultSection = document.getElementById('exam-result');

const studentNameInput = document.getElementById('studentName');
const studentSchoolInput = document.getElementById('studentSchool');
const studentClassSelect = document.getElementById('studentClass');
const examSubjectSelect = document.getElementById('examSubject');
const examTermSelect = document.getElementById('examTerm');

const displayStudentName = document.getElementById('displayStudentName');
const displayStudentSchool = document.getElementById('displayStudentSchool');
const displayStudentClass = document.getElementById('displayStudentClass');
const displayExamSubject = document.getElementById('displayExamSubject');
const displayExamTerm = document.getElementById('displayExamTerm');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const timeDisplay = document.getElementById('time');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const submitExamButton = document.getElementById('submit-exam-button');

const numQuestionsDisplay = document.getElementById('numQuestionsDisplay');
const examDurationDisplay = document.getElementById('examDurationDisplay');
const startExamButton = document.getElementById('startExamButton');
const attemptWarning = document.getElementById('attempt-warning');

const previousResultDisplay = document.getElementById('previous-result-display');
const prevName = document.getElementById('prev-name');
const prevSchool = document.getElementById('prev-school');
const prevClass = document.getElementById('prev-class');
const prevSubject = document.getElementById('prev-subject');
const prevTerm = document.getElementById('prev-term');
const prevScore = document.getElementById('prev-score');
const prevTotal = document.getElementById('prev-total');

// Admin Panel Elements
const adminSecretInput = document.getElementById('admin-secret-input');
const adminPanel = document.getElementById('admin-panel');
const localStorageViewer = document.getElementById('localStorageViewer');
const adminResetCodeInput = document.getElementById('admin-reset-code-input');
const adminResetMessage = document.getElementById('admin-reset-message');
const ADMIN_SECRET_CODE = 'adminmode'; // Your secret code to reveal the panel
const ADMIN_RESET_CODE = 'resetall'; // Your secret code to perform a targeted reset


// --- Initial Setup and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to selection boxes for dynamic updates
    studentNameInput.addEventListener('input', updateExamDetailsDisplay);
    studentSchoolInput.addEventListener('input', updateExamDetailsDisplay);
    studentClassSelect.addEventListener('change', updateExamDetailsDisplay);
    examSubjectSelect.addEventListener('change', updateExamDetailsDisplay);
    examTermSelect.addEventListener('change', updateExamDetailsDisplay);

    // IMPORTANT: Attach the start exam button listener
    startExamButton.addEventListener('click', startExam); // *** FIXED: Added missing event listener ***

    // Load and display previous exam result if available
    displayPreviousResult(); // *** FIXED: Moved here to ensure DOM is ready ***

    // Admin secret input listener (hidden by default)
    document.addEventListener('keydown', (e) => {
        // Pressing ` (backtick, usually top-left of keyboard) will focus the secret input
        if (e.key === '`' || e.key === '~') {
            e.preventDefault(); // Prevent typing ` into other fields if focused
            adminSecretInput.style.position = 'static'; // Make it visible temporarily
            adminSecretInput.style.opacity = '1';
            adminSecretInput.style.pointerEvents = 'auto';
            adminSecretInput.focus();
            setTimeout(() => { // Hide it again after a short delay if not used
                if (document.activeElement !== adminSecretInput) {
                    adminSecretInput.style.position = 'absolute';
                    adminSecretInput.style.opacity = '0';
                    adminSecretInput.style.pointerEvents = 'none';
                }
            }, 5000); // 5 seconds to type the code
        }
    });

    adminSecretInput.addEventListener('input', () => {
        if (adminSecretInput.value === ADMIN_SECRET_CODE) {
            adminPanel.style.display = 'block';
            adminSecretInput.value = ''; // Clear input after successful entry
            adminSecretInput.style.position = 'absolute'; // Hide the input again
            adminSecretInput.style.opacity = '0';
            adminSecretInput.style.pointerEvents = 'none';
        } else {
            adminPanel.style.display = 'none';
        }
    });

    // Initial update to reflect any pre-filled form data or previous results
    updateExamDetailsDisplay();
});

/**
 * Dynamically loads exam questions from a JSON file based on selected criteria.
 * @param {string} studentClass - The selected class (e.g., "JSS1").
 * @param {string} examSubject - The selected subject (e.g., "Mathematics").
 * @param {string} examTerm - The selected term (e.g., "First Term").
 * @returns {Promise<Array>} A promise that resolves to an array of question objects, or an empty array if not found/error.
 */
async function loadQuestionsForExam(studentClass, examSubject, examTerm) {
    // Normalize names for file paths (lowercase, replace spaces with underscores)
    const classPath = studentClass.toLowerCase().replace(/\s/g, '_');
    const subjectPath = examSubject.toLowerCase().replace(/\s/g, '_');
    const termPath = examTerm.toLowerCase().replace(/\s/g, '_');

    // Construct the file path relative to your site's root
    const filePath = `data/${classPath}/${subjectPath}/${termPath}.json`;
    // console.log("Attempting to fetch from path:", filePath); // Keep for debugging if needed

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`No questions file found for: ${filePath}`);
            } else {
                // Log other HTTP errors
                console.error(`HTTP error! Status: ${response.status} for ${filePath}`);
            }
            return []; // Return empty array if file not found or other HTTP error
        }
        const questions = await response.json();
        return questions;
    } catch (error) {
        console.error("Failed to load questions due to network or JSON parsing error:", error); // *** FIXED: More specific error message ***
        return []; // Return empty array on any other error
    }
}


// Function to update the displayed number of questions and estimated duration
async function updateExamDetailsDisplay() {
    const selectedName = studentNameInput.value.trim();
    const selectedSchool = studentSchoolInput.value.trim();
    const selectedClass = studentClassSelect.value;
    const selectedSubject = examSubjectSelect.value;
    const selectedTerm = examTermSelect.value;

    let numberOfQuestions = 0;
    let estimatedDurationInMinutes = 0;
    let questionsForSelection = [];

    // Check if a valid combination is selected before trying to load
    if (selectedClass && selectedSubject && selectedTerm) {
        questionsForSelection = await loadQuestionsForExam(selectedClass, selectedSubject, selectedTerm);
        numberOfQuestions = questionsForSelection.length;
        estimatedDurationInMinutes = Math.ceil((numberOfQuestions * 30) / 60); // 30 seconds per question
    }


    // Check attempts and disable button if maxed out
    // Unique key for attempt tracking includes all student info for better specificity
    const examKey = `${selectedSchool}-${selectedClass}-${selectedSubject}-${selectedTerm}-${selectedName}`;
    const attemptsData = JSON.parse(localStorage.getItem('examAttempts') || '{}'); // *** FIXED: Added '|| {}' for robustness if item is null ***
    const currentAttempts = attemptsData[examKey] || 0;

    // Enable/disable start button logic
    const canStart = numberOfQuestions > 0 && selectedName && selectedSchool && selectedClass && selectedSubject && selectedTerm;

    if (canStart && currentAttempts >= MAX_ATTEMPTS) {
        startExamButton.disabled = true;
        attemptWarning.style.display = 'block';
        attemptWarning.textContent = `You have reached the maximum (${MAX_ATTEMPTS}) attempts for this exam combination (${selectedName} - ${selectedSchool} - ${selectedClass} - ${selectedSubject} - ${selectedTerm}).`;
    } else if (canStart) {
        startExamButton.disabled = false;
        attemptWarning.style.display = 'none';
    } else {
        startExamButton.disabled = true;
        attemptWarning.style.display = 'none'; // Hide warning if not all fields are selected
    }


    numQuestionsDisplay.textContent = numberOfQuestions;
    examDurationDisplay.textContent = estimatedDurationInMinutes;
}

// Function to load and display previous exam result
function displayPreviousResult() {
    const lastResult = localStorage.getItem('lastTermlyExamResult');
    if (lastResult) {
        try {
            const result = JSON.parse(lastResult);
            prevName.textContent = result.name;
            prevSchool.textContent = result.school;
            prevClass.textContent = result.class;
            prevSubject.textContent = result.subject;
            prevTerm.textContent = result.term;
            prevScore.textContent = result.score;
            prevTotal.textContent = result.total;
            previousResultDisplay.style.display = 'block';
        } catch (e) {
            console.error("Error parsing last exam result from localStorage:", e);
            previousResultDisplay.style.display = 'none';
        }
    } else {
        previousResultDisplay.style.display = 'none';
    }
}

// --- Exam Logic ---
async function startExam() {
    studentInfo.name = studentNameInput.value.trim();
    studentInfo.school = studentSchoolInput.value.trim();
    studentInfo.class = studentClassSelect.value;
    studentInfo.subject = examSubjectSelect.value;
    studentInfo.term = examTermSelect.value;

    if (!studentInfo.name || !studentInfo.school || !studentInfo.class || !studentInfo.subject || !studentInfo.term) {
        alert("Please fill in all student details (Name, School, Class, Subject, Term) to start the exam.");
        return;
    }

    // Attempt Limit Check (redundant but good for robustness if updateExamDetailsDisplay was skipped)
    const examKey = `${studentInfo.school}-${studentInfo.class}-${studentInfo.subject}-${studentInfo.term}-${studentInfo.name}`;
    const attemptsData = JSON.parse(localStorage.getItem('examAttempts') || '{}'); // *** FIXED: Added '|| {}' ***
    const currentAttempts = attemptsData[examKey] || 0;

    if (currentAttempts >= MAX_ATTEMPTS) {
        alert(`You have already reached the maximum (${MAX_ATTEMPTS}) attempts for this exam.`);
        return;
    }

    // Load questions dynamically based on selected criteria
    currentExamQuestions = await loadQuestionsForExam(studentInfo.class, studentInfo.subject, studentInfo.term);

    if (currentExamQuestions.length === 0) {
        alert("No questions available for this selection. Please check the subject/class/term combination or add questions.");
        return;
    }

    // Update display info in exam content section
    displayStudentName.textContent = studentInfo.name;
    displayStudentSchool.textContent = studentInfo.school;
    displayStudentClass.textContent = studentInfo.class;
    displayExamSubject.textContent = studentInfo.subject;
    displayExamTerm.textContent = studentInfo.term;

    // Transition to exam content
    examSetupSection.style.display = 'none';
    adminPanel.style.display = 'none'; // Hide admin panel if visible
    adminSecretInput.value = ''; // Clear secret input
    adminResetCodeInput.value = ''; // Clear reset code input
    adminResetMessage.textContent = ''; // Clear reset message
    examContentSection.style.display = 'block';

    // Start exam
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = {}; // Reset answers for new exam
    loadQuestion();
    // Set timer based on number of questions (e.g., 30 seconds per question)
    timeLeft = currentExamQuestions.length * 30;
    startTimer();
}

function loadQuestion() {
    const question = currentExamQuestions[currentQuestionIndex];
    questionText.textContent = `${currentQuestionIndex + 1}. ${question.question}`;
    optionsContainer.innerHTML = ''; // Clear previous options

    // Check if question.options exists and is an array
    if (!question.options || !Array.isArray(question.options)) {
        console.error(`Question ${currentQuestionIndex + 1} is missing 'options' or 'options' is not an array.`, question);
        optionsContainer.textContent = "Error: Options not found for this question.";
        return; // Stop loading this question's options
    }

    question.options.forEach((option, index) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `question${currentQuestionIndex}`; // Unique name for each question's radios
        input.value = option;
        input.onclick = () => saveAnswer(currentQuestionIndex, option); // Save answer when selected

        // If user already answered this question, pre-select their choice
        if (userAnswers[currentQuestionIndex] === option) {
            input.checked = true;
        }

        label.appendChild(input);
        label.appendChild(document.createTextNode(option));
        optionsContainer.appendChild(label);
    });

    updateNavigationButtons();
}

function saveAnswer(qIndex, selectedOption) {
    userAnswers[qIndex] = selectedOption;
}

function startTimer() {
    updateTimerDisplay(); // Call immediately to show initial time
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timer);
            alert("Time's up! Your exam will be submitted automatically.");
            submitExam();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateNavigationButtons() {
    prevButton.disabled = currentQuestionIndex === 0;
    nextButton.style.display = currentQuestionIndex < currentExamQuestions.length - 1 ? 'inline-block' : 'none';
    submitExamButton.style.display = currentQuestionIndex === currentExamQuestions.length - 1 ? 'inline-block' : 'none';
}

function nextQuestion() {
    if (currentQuestionIndex < currentExamQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

function submitExam() {
    clearInterval(timer); // Stop timer

    score = 0;
    currentExamQuestions.forEach((question, index) => {
        // *** CRITICAL FIX: Changed question.answer to question.correct ***
        // Assuming your JSON question objects will have a 'correct' property, not 'answer'
        // based on your previous 'allQuizData' structure.
        if (userAnswers[index] === question.correct) {
            score++;
        }
    });

    // Save result to localStorage
    const resultToSave = {
        name: studentInfo.name,
        school: studentInfo.school,
        class: studentInfo.class,
        subject: studentInfo.subject,
        term: studentInfo.term,
        score: score,
        total: currentExamQuestions.length,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('lastTermlyExamResult', JSON.stringify(resultToSave));

    // Update attempt count
    const examKey = `${studentInfo.school}-${studentInfo.class}-${studentInfo.subject}-${studentInfo.term}-${studentInfo.name}`;
    const attemptsData = JSON.parse(localStorage.getItem('examAttempts') || '{}'); // *** FIXED: Added '|| {}' ***
    attemptsData[examKey] = (attemptsData[examKey] || 0) + 1;
    localStorage.setItem('examAttempts', JSON.stringify(attemptsData));


    displayResults();
}

function displayResults() {
    examContentSection.style.display = 'none';
    examResultSection.style.display = 'block';

    document.getElementById('result-name').textContent = studentInfo.name;
    document.getElementById('result-school').textContent = studentInfo.school;
    document.getElementById('result-class').textContent = studentInfo.class;
    document.getElementById('result-subject').textContent = studentInfo.subject;
    document.getElementById('result-term').textContent = studentInfo.term;
    document.getElementById('result-score').textContent = score;
    document.getElementById('result-total').textContent = currentExamQuestions.length;

    const answersReview = document.getElementById('answers-review');
    answersReview.innerHTML = '';
    currentExamQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        // *** CRITICAL FIX: Changed question.answer to question.correct ***
        const isCorrect = userAnswer === question.correct;

        const reviewItem = document.createElement('p');
        reviewItem.innerHTML = `
            <strong>Question ${index + 1}:</strong> ${question.question}<br>
            Your Answer: <span style="color: ${isCorrect ? 'green' : 'red'};">${userAnswer || 'No Answer Selected'}</span><br>
            Correct Answer: <span style="color: green;">${question.correct}</span>
        `;
        answersReview.appendChild(reviewItem);
    });
}

// --- Admin Functions (Client-side, non-secure) ---
function clearLastExamResult() {
    if (confirm("Are you sure you want to clear the LAST EXAM RESULT saved on THIS COMPUTER?")) {
        localStorage.removeItem('lastTermlyExamResult');
        alert("Last exam result cleared.");
        location.reload(); // Reload to update display
    }
}

function clearAllAttemptCounts() {
    if (confirm("Are you sure you want to clear ALL ATTEMPT COUNTS saved on THIS COMPUTER? This will allow new attempts.")) {
        localStorage.removeItem('examAttempts');
        alert("All exam attempt counts cleared.");
        location.reload(); // Reload to update display
    }
}

function clearAllLocalStorage() {
    if (confirm("WARNING: Are you sure you want to clear ALL LOCAL STORAGE DATA for this website on THIS COMPUTER? This will remove all saved results, attempt counts, and any other local data.")) {
        localStorage.clear();
        alert("All local storage data cleared.");
        location.reload(); // Reload to update display
    }
}

function toggleLocalStorageViewer() {
    if (localStorageViewer.style.display === 'none') {
        let allData = '';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            // Try to pretty-print JSON if it is JSON
            try {
                const parsedValue = JSON.parse(value);
                allData += `--- ${key} ---\n${JSON.stringify(parsedValue, null, 2)}\n\n`;
            } catch (e) {
                allData += `--- ${key} ---\n${value}\n\n`;
            }
        }
        localStorageViewer.value = allData || 'No data in Local Storage.';
        localStorageViewer.style.display = 'block';
    } else {
        localStorageViewer.style.display = 'none';
        localStorageViewer.value = '';
    }
}

function attemptAdminReset() {
    const enteredCode = adminResetCodeInput.value.trim();
    if (enteredCode === ADMIN_RESET_CODE) {
        if (confirm("Are you sure you want to clear ALL STUDENT-RELATED DATA (Last Exam Result and All Attempt Counts) from this computer's local storage? This action cannot be undone.")) {
            localStorage.removeItem('lastTermlyExamResult');
            localStorage.removeItem('examAttempts');
            adminResetMessage.style.color = 'green';
            adminResetMessage.textContent = "Student data successfully reset!";
            alert("Student data reset.");
            location.reload(); // Reload to update display
        } else {
            adminResetMessage.style.color = 'gray';
            adminResetMessage.textContent = "Reset cancelled.";
        }
    } else {
        adminResetMessage.style.color = 'red';
        adminResetMessage.textContent = "Incorrect reset code.";
    }
    adminResetCodeInput.value = ''; // Clear input field
}

// Attach directly to the buttons defined in HTML for admin functions
// Assuming these are defined in your HTML with these IDs and onclick attributes
// Or, if not, you should add event listeners here instead of inline onclick.
// For example:
// document.getElementById('clearLastResultBtn').addEventListener('click', clearLastExamResult);
// document.getElementById('clearAttemptsBtn').addEventListener('click', clearAllAttemptCounts);
// document.getElementById('clearAllStorageBtn').addEventListener('click', clearAllLocalStorage);
// document.getElementById('toggleStorageViewerBtn').addEventListener('click', toggleLocalStorageViewer);
// document.getElementById('adminResetBtn').addEventListener('click', attemptAdminReset);
