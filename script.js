
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }, 100);
}


let userMobile = '';
let userName = '';
let selectedNumber = null;
let gameEnded = false;
const MAX_TEAM_CAPACITY = 10;
let teamACurrent = 0;
let teamBCurrent = 0;

function login() {
    const mobile = document.getElementById('mobile').value;
    const name = document.getElementById('name').value;
    if (mobile.length === 10 && name.trim() !== '') {
        userMobile = mobile;
        userName = name;
        alert('🎯 Login Successful! \n📱 OTP sent to ' + mobile);
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('game-section').classList.remove('hidden');
        loadNumbers();
        checkGameStatus();
    } else {
        showNotification('⚠️ Please enter:\n📱 Valid 10-digit number\n👤 Your name', 'error');
    }
}

function loadNumbers() {
    const numbersDiv = document.getElementById('numbers');
    numbersDiv.innerHTML = '';
    if (!gameEnded) {
        numbersDiv.innerHTML = `
            <p>A new game has started! Pick your number below.</p>
            <div class="team-status">
                <p>Team A (0-4): ${teamACurrent}/${MAX_TEAM_CAPACITY} players</p>
                <p>Team B (5-9): ${teamBCurrent}/${MAX_TEAM_CAPACITY} players</p>
            </div>
        `;
        for (let i = 0; i < 10; i++) {
            const btn = document.createElement('div');
            btn.className = 'number-btn';
            btn.textContent = i;
            btn.onclick = () => selectNumber(i);
            numbersDiv.appendChild(btn);
        }
    } else {
        numbersDiv.innerHTML = '<p>Betting is closed. Check the winner below!</p>';
    }
}

function selectNumber(num) {
    if (gameEnded) {
        alert('Betting is closed! Check the winner below.');
        return;
    }
    if (selectedNumber === null) {
        selectedNumber = num;
        document.querySelectorAll('.number-btn')[num].classList.add('taken');
        document.getElementById('payment-section').classList.remove('hidden');
    } else {
        alert('You already picked a number!');
    }
}

function resetSelection() {
    selectedNumber = null;
    document.querySelectorAll('.number-btn').forEach(btn => btn.classList.remove('taken'));
    document.getElementById('payment-section').classList.add('hidden');
    showNotification('Selection reset! Pick a new number.', 'success');
}

function submitBet() {
    if (selectedNumber === null) {
        showNotification('Please select a number first!', 'error');
        return;
    }

    // Check team capacity
    if (selectedNumber < 5 && teamACurrent >= MAX_TEAM_CAPACITY) {
        showNotification('Team A is full! Please select a number for Team B (5-9)', 'error');
        return;
    }
    if (selectedNumber >= 5 && teamBCurrent >= MAX_TEAM_CAPACITY) {
        showNotification('Team B is full! Please select a number for Team A (0-4)', 'error');
        return;
    }

    const submitButton = document.querySelector('#payment-section button');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    // Update team counts
    if (selectedNumber < 5) {
        teamACurrent++;
    } else {
        teamBCurrent++;
    }

    const betData = {
        type: 'bet',
        mobile: userMobile,
        name: userName,
        number: selectedNumber,
        paymentStatus: 'Pending',
        timestamp: new Date().toISOString()
    };
    
    console.log('Bet Data:', betData);
    sendToGoogleSheets(betData);

    // Create a WhatsApp link with pre-filled message
    const message = `Cricket Bet Payment Screenshot\nName: ${userName}\nMobile: ${userMobile}\nNumber: ${selectedNumber}\nPlease attach your payment screenshot.`;
    const whatsappUrl = `https://chat.whatsapp.com/Llpk9VH8Hxw53bKQ9t1Rbm?text=${encodeURIComponent(message)}`;
    
    document.getElementById('numbers').style.display = 'none';
    localStorage.setItem('betPlaced', 'true');
    
    alert('🎲 Bet Successfully Submitted!\n\n🔢 Your Number: ' + selectedNumber + '\n\n📸 Next Steps:\n1. Send payment screenshot\n2. Include your name: ' + userName + '\n\n➡️ Redirecting to WhatsApp...');
    window.open(whatsappUrl, '_blank');
    checkGameStatus();
}

function sendToGoogleSheets(betData) {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyApcoqaFeAXdF6HBY6kHOMKsgwsv3P6Mhr9A8D00Ve0RjOUr96CikA6p3XvxaOm88/exec';
    console.log('Sending to URL:', scriptURL);

    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(betData)
    })
    .then(response => {
        console.log('Response received (no-cors mode, response not readable)');
    })
    .catch(error => {
        console.error('Error sending bet:', error);
        alert('Error submitting bet. Please try again.');
    });
}

window.handleWinnerData = function(data) {
    console.log('Winner data:', data);
    const numbersDiv = document.getElementById('numbers');
    numbersDiv.innerHTML = '';
    if (data.gameEnded) {
        gameEnded = true;
        numbersDiv.innerHTML = '<p>Betting is closed. Check the winner below!</p>';
        document.getElementById('payment-section').classList.add('hidden');
        document.getElementById('winner-section').classList.remove('hidden');
        document.getElementById('winning-team').textContent = data.winningTeam;
        document.getElementById('winning-number').textContent = data.winningNumber;
    } else {
        gameEnded = false;
        document.getElementById('winner-section').classList.add('hidden');
        loadNumbers();
    }
};

function checkGameStatus() {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbyApcoqaFeAXdF6HBY6kHOMKsgwsv3P6Mhr9A8D00Ve0RjOUr96CikA6p3XvxaOm88/exec';
    const callbackName = 'handleWinnerData';
    const url = `${scriptURL}?callback=${callbackName}`;

    const numbersDiv = document.getElementById('numbers');
    numbersDiv.innerHTML = '<p>Loading game status...</p><div class="loading-bar"></div>';

    const existingScript = document.getElementById('winner-data-script');
    if (existingScript) {
        existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'winner-data-script';
    script.src = url;
    script.onerror = () => {
        console.error('Error fetching game status');
        numbersDiv.innerHTML = '<p>Error loading game status. Please refresh the page.</p>';
    };
    document.head.appendChild(script);
}

// Initialize any necessary event listeners here
document.addEventListener('DOMContentLoaded', () => {
    checkGameStatus();
});
