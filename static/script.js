const API_URL = window.location.origin;

const DEFAULT_CATEGORIES = ["Food🍕", "Transport🚂 ", "Bills💸", "Entertainment🤡","Shopping🛍️","Therapy 🩺", "Others"];

// Function to strip emojis from a string
function stripEmojis(text) {
    return text.replace(/[\u{1F600}-\u{1F64F}]/gu, '')
               .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
               .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
               .replace(/[\u{1F700}-\u{1F77F}]/gu, '')
               .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
               .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
               .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
               .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
               .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
               .replace(/[\u{2600}-\u{26FF}]/gu, '')
               .replace(/[\u{2700}-\u{27BF}]/gu, '');
}

const messages = [
    "💸 Counting your regrets… I mean, transactions… 💸",
    "🏦 Asking your bank if it’s okay to proceed… 📞",
    "🎢 Analyzing your financial rollercoaster… 📊",
    "🛍️ Rethinking that last online shopping spree… 🤔",
    "🛒 Compiling all your 'just one more' purchases… 💳",
    "💳 Checking if your card is still breathing… 🚑",
    "🍕 Calculating how much of your salary went to food… 😋",
    "🎰 Spinning the wheel of 'Do I have enough money?' 🤞",
    "🏖️ Searching for your retirement fund… Found: 404 🔎",
    "🏃‍♂️ Watching your money run faster than you… 💨",
    "📅 Estimating how long until payday saves you… ⏳",
    "🔎 Looking for savings… Please wait… 🧐",
    "💰 Your money was here… and now it’s gone! 💨",
    "🚀 Sending a rescue mission for your budget… 🆘",
    "🤷‍♂️ Trying to explain your expenses to your future self… 😬"
];

let messageIndex = 0;
let charIndex = 0;
let typingInterval;

function typeMessage() {
    const message = messages[messageIndex];
    const loadingMessageElement = document.getElementById("loading-message");
    loadingMessageElement.textContent = message.slice(0, charIndex);
    charIndex++;

    if (charIndex > message.length) {
        clearInterval(typingInterval);
        setTimeout(() => {
            loadingMessageElement.classList.add("fade-out");
            setTimeout(() => {
                messageIndex = (messageIndex + 1) % messages.length;
                charIndex = 0;
                loadingMessageElement.classList.remove("fade-out");
                typingInterval = setInterval(typeMessage, 75);
            }, 500); // Wait for the fade-out effect to complete
        }, 2000); // Wait for 2 seconds before typing the next message
    }
}

function startMessageCycle() {
    typingInterval = setInterval(typeMessage, 100);
}

// Fetch categories and populate dropdown
async function fetchCategories() {
    let select = document.getElementById("category");
    select.innerHTML = '<option value="">Select</option>';
    // Add default categories
    DEFAULT_CATEGORIES.forEach(cat => {
        let option = document.createElement("option");
        option.value = stripEmojis(cat);
        option.textContent = cat;
        select.appendChild(option);
    });
}

// Show/hide custom category input
document.getElementById("category").addEventListener("change", function() {
    let customCategoryLabel = document.getElementById("custom-category-label");
    let customCategoryInput = document.getElementById("custom-category");
    if (this.value === "Others") {
        customCategoryLabel.style.display = "block";
        customCategoryInput.required = true;
    } else {
        customCategoryLabel.style.display = "none";
        customCategoryInput.required = false;
    }
});

// Update file upload label with file name
document.getElementById("file-upload").addEventListener("change", function() {
    const fileName = this.files[0] ? this.files[0].name : "Upload File";
    document.getElementById("file-upload-label").textContent = fileName;
});

// Fetch and display expenses
async function fetchExpenses() {
    startMessageCycle();
    let response = await fetch(`${API_URL}/get_expenses`);
    let expenses = await response.json();
    let tableBody = document.getElementById("expense-table-body");
    tableBody.innerHTML = "";

    expenses.forEach(exp => {
        let row = document.createElement("tr");
        row.setAttribute("data-id", exp.id);
        row.innerHTML = `
            <td>${exp.name}</td>
            <td>${exp.date}</td>
            <td>${exp.category}</td>
            <td>${exp.description || ""}</td>
            <td>₹${exp.amount}</td>
            <td>
                <button class="edit-btn edit" onclick="editExpense(${exp.id})">✏️</button>
                <button class="delete-btn delete" onclick="deleteExpense(${exp.id})">❌</button>
            </td>
            <td>
                ${exp.image_url ? getFileLink(exp.image_url, exp.file_type) : "No file"}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function getFileLink(url, fileType) {
    const imageTypes = ["image/jpeg", "image/png"];
    if (imageTypes.includes(fileType)) {
        return `<img src="${url}" class="thumbnail" onclick="showImagePopup('${url}')" />`;
    } else if (fileType === "application/pdf") {
        return `<a href="${url}" target="_blank">👀📄</a>`;
    } else if (fileType === "application/msword" || fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return `<a href="${url}" target="_blank">📥📄</a>`;
    } else {
        return `<a href="${url}" target="_blank">View File</a>`;
    }
}

function openPdfInNewTab(url) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        })
        .catch(error => console.error('Error opening PDF:', error));
}

// Show image in a popup
function showImagePopup(imageUrl) {
    let popup = document.createElement("div");
    popup.classList.add("image-popup");
    popup.innerHTML = `
        <div class="popup-content">
            <span class="close-btn" onclick="closeImagePopup()">&times;</span>
            <img src="${imageUrl}" />
        </div>
    `;
    document.body.appendChild(popup);
}

// Close image popup
function closeImagePopup() {
    let popup = document.querySelector(".image-popup");
    if (popup) {
        popup.remove();
    }
}

// Add new expense
document.getElementById("expense-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    let formData = new FormData(event.target);

    // Handle custom category
    let categorySelect = document.getElementById("category");
    if (categorySelect.value === "Others") {
        let customCategory = document.getElementById("custom-category").value;
        formData.set("category", stripEmojis(customCategory));
    } else {
        formData.set("category", stripEmojis(categorySelect.value));
    }

    let expenseId = document.getElementById("expense-id").value;
    let url = `${API_URL}/add_expense`;
    let method = "POST";

    if (expenseId) {
        url = `${API_URL}/edit_expense/${expenseId}`;
        method = "PUT";
    }

    let response = await fetch(url, {
        method: method,
        body: formData
    });

    let result = await response.json();
    fetchExpenses();
    event.target.reset();
    document.getElementById("custom-category-label").style.display = "none";
    document.getElementById("expense-id").value = ""; // Clear the hidden input field
    document.getElementById("file-upload-label").textContent = "Upload File"; // Reset file upload label
});

// Update expense field inline
async function updateExpense(id, field, value) {
    let formData = new FormData();
    formData.append(field, value);

    await fetch(`${API_URL}/edit_expense/${id}`, {
        method: "PUT",
        body: formData
    });

    fetchExpenses();
}

// Upload image
async function uploadImage(id, file) {
    let formData = new FormData();
    formData.append("file-upload", file);

    await fetch(`${API_URL}/edit_expense/${id}`, {
        method: "PUT",
        body: formData
    });

    fetchExpenses();
}

// Delete expense
async function deleteExpense(id) {
    await fetch(`${API_URL}/delete_expense/${id}`, { method: "DELETE" });
    fetchExpenses();
}

// Fetch and display expense details for editing
async function fetchExpenseDetails(id) {
    let response = await fetch(`${API_URL}/get_expense/${id}`);
    if (response.status === 404) {
        alert("Expense not found");
        return;
    }
    let expense = await response.json();

    document.getElementById("expense-id").value = expense.id; // Set the hidden input field with the expense ID
    document.getElementById("name").value = expense.name;
    document.getElementById("category").value = expense.category;
    document.getElementById("category-desc").value = expense.category_desc;
    document.getElementById("date").value = expense.date;
    document.getElementById("amount").value = expense.amount;
    document.getElementById("description").value = expense.description;
    document.getElementById("file-upload").value = ""; // Clear the file input

    // Show custom category input if the category is "Others" or a custom category
    if (expense.category === "Others" || !DEFAULT_CATEGORIES.includes(expense.category)) {
        document.getElementById("custom-category-label").style.display = "block";
        document.getElementById("custom-category").value = expense.category;
        document.getElementById("category").value = "Others";
    } else {
        document.getElementById("custom-category-label").style.display = "none";
    }
}

// Edit expense
async function editExpense(id) {
    await fetchExpenseDetails(id);
    document.getElementById("expense-form").scrollIntoView({ behavior: "smooth" });
}

// Initialize
fetchCategories().then(() => {
    fetchExpenses();
});
