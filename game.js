// Game state
let gameState = {
    playerName: '',
    currentTopic: null,
    currentWord: null,
    completedTopics: new Set(),
    topics: [],
    topicProgress: {}, // Store progress for each topic
    completedWords: new Set() // Track completed words in current topic
};

// Logout function
function logout() {
    // Clear game state
    gameState.playerName = '';
    gameState.currentTopic = null;
    gameState.currentWord = null;
    gameState.completedTopics.clear();
    gameState.topics = [];
    gameState.topicProgress = {};
    
    // Clear localStorage
    localStorage.removeItem('wordGameData');
    
    // Show login screen and hide game screen
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    // Clear player name input
    document.getElementById('player-name').value = '';
}

// Reset all progress
function resetProgress() {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        // Clear all progress
        gameState.completedTopics.clear();
        gameState.topicProgress = {};
        
        // Initialize progress for all topics
        gameState.topics.forEach(topic => {
            initTopicProgress(topic);
        });
        
        // Save empty progress
        savePlayerData();
        
        // Update UI
        renderTopics();
    }
}

// Load player data from localStorage
function loadPlayerData() {
    const savedData = localStorage.getItem('wordGameData');
    if (savedData) {
        const data = JSON.parse(savedData);
        gameState.playerName = data.playerName;
        gameState.completedTopics = new Set(data.completedTopics);
        gameState.topicProgress = data.topicProgress || {};
        
        // Show game screen if player data exists
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        // Update player info display
        const playerInfo = document.getElementById('player-info');
        playerInfo.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="player-label">Player:</span>
                <span class="player-name">${gameState.playerName}</span>
                <button id="logout-button" class="btn btn-sm btn-outline-danger">Logout</button>
            </div>
        `;
        
        // Add logout event listener
        document.getElementById('logout-button').addEventListener('click', logout);
        
        // Load topics after player data is loaded
        loadTopics();
    }
}

// Save player data to localStorage
function savePlayerData() {
    const data = {
        playerName: gameState.playerName,
        completedTopics: Array.from(gameState.completedTopics),
        topicProgress: gameState.topicProgress
    };
    localStorage.setItem('wordGameData', JSON.stringify(data));
}

// Load topics from JSON file
async function loadTopics() {
    try {
        const response = await fetch('words.json');
        const data = await response.json();
        gameState.topics = data.topics;
        renderTopics();
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading topics:', error);
        return Promise.reject(error);
    }
}

// Function to handle login
function handleLogin() {
    const name = document.getElementById('player-name').value.trim();
    if (name) {
        gameState.playerName = name;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        // Update player info display
        const playerInfo = document.getElementById('player-info');
        playerInfo.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="player-label">Player:</span>
                <span class="player-name">${gameState.playerName}</span>
                <button id="logout-button" class="btn btn-sm btn-outline-danger">Logout</button>
            </div>
        `;
        
        // Add logout event listener
        document.getElementById('logout-button').addEventListener('click', logout);
        
        // Save player data
        savePlayerData();
        
        // Load topics and select first one by default
        loadTopics().then(() => {
            if (gameState.topics.length > 0 && !gameState.currentTopic) {
                selectTopic(gameState.topics[0]);
            }
        });
    }
}

// Initialize the game
function initGame() {
    const startButton = document.getElementById('start-game');
    const playerNameInput = document.getElementById('player-name');
    const resetButton = document.getElementById('reset-progress');
    const resetButtonDesktop = document.getElementById('reset-progress-desktop');
    
    // Try to load saved player data
    loadPlayerData();
    
    // Add click event listener to start button
    startButton.addEventListener('click', handleLogin);

    // Add keypress event listener for Enter key
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    // Add reset progress handlers
    resetButton.addEventListener('click', resetProgress);
    resetButtonDesktop.addEventListener('click', resetProgress);
}

// Initialize topic progress
function initTopicProgress(topic) {
    if (!gameState.topicProgress[topic.id]) {
        gameState.topicProgress[topic.id] = {
            total: topic.words.length,
            completed: 0
        };
    }
}

// Render topics list
function renderTopics() {
    const topicsList = document.getElementById('topics-list');
    const topicsListDesktop = document.getElementById('topics-list-desktop');
    
    // Clear both lists
    topicsList.innerHTML = '';
    topicsListDesktop.innerHTML = '';
    
    gameState.topics.forEach(topic => {
        // Initialize progress for new topics
        initTopicProgress(topic);
        
        const topicElement = document.createElement('div');
        topicElement.className = `topic-item ${gameState.completedTopics.has(topic.id) ? 'completed' : ''}`;
        
        // Create topic content with progress
        const progress = gameState.topicProgress[topic.id];
        topicElement.innerHTML = `
            <div class="topic-header">
                <div class="topic-name">${topic.name}</div>
                <div class="progress-text">${progress.completed}/${progress.total}</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(progress.completed / progress.total) * 100}%"></div>
            </div>
        `;
        
        // Clone the element for desktop view
        const topicElementDesktop = topicElement.cloneNode(true);
        
        // Add click handlers
        topicElement.addEventListener('click', () => {
            selectTopic(topic);
            // Close offcanvas on mobile after selection
            if (window.innerWidth <= 768) {
                const offcanvas = document.getElementById('topicsOffcanvas');
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
                if (bsOffcanvas) {
                    bsOffcanvas.hide();
                }
            }
        });
        
        topicElementDesktop.addEventListener('click', () => selectTopic(topic));
        
        // Add to both lists
        topicsList.appendChild(topicElement);
        topicsListDesktop.appendChild(topicElementDesktop);
    });
}

// Select a topic and start the game
function selectTopic(topic) {
    gameState.currentTopic = topic;
    gameState.completedWords.clear(); // Clear completed words when selecting new topic
    
    // Check if topic is completed
    if (gameState.completedTopics.has(topic.id)) {
        // Clear game area
        document.getElementById('drop-zones').innerHTML = '';
        document.getElementById('letter-cards').innerHTML = '';
        document.getElementById('result-message').textContent = '';
        document.getElementById('check-word').classList.add('hidden');
        
        // Hide other GIFs
        document.getElementById('error-gif').classList.add('hidden');
        document.getElementById('success-gif').classList.add('hidden');
        
        // Show completion message and GIF
        document.getElementById('translation').textContent = 'All done here!';
        document.getElementById('completion-gif').classList.remove('hidden');
        
        // Play completion sound
        const completionSound = document.getElementById('completion-sound');
        completionSound.currentTime = 0;
        completionSound.play();
        
        return;
    }
    
    // Hide completion GIF when starting new topic
    document.getElementById('completion-gif').classList.add('hidden');
    startNewWord();
}

// Start a new word from the current topic
function startNewWord() {
    const words = gameState.currentTopic.words;
    
    // Filter out completed words
    const availableWords = words.filter(word => !gameState.completedWords.has(word.en));
    
    // If all words are completed, clear completed words and start over
    if (availableWords.length === 0) {
        gameState.completedWords.clear();
        gameState.currentWord = words[Math.floor(Math.random() * words.length)];
    } else {
        gameState.currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    }
    
    // Clear previous game state
    document.getElementById('drop-zones').innerHTML = '';
    document.getElementById('letter-cards').innerHTML = '';
    document.getElementById('result-message').textContent = '';
    document.getElementById('check-word').classList.add('hidden');
    
    // Show translation
    document.getElementById('translation').textContent = gameState.currentWord.ua;
    
    // Create drop zones
    const dropZones = document.getElementById('drop-zones');
    for (let i = 0; i < gameState.currentWord.en.length; i++) {
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.dataset.index = i;
        
        // Add click handler to clear the letter
        dropZone.addEventListener('click', () => {
            if (dropZone.textContent) {
                // Return the letter to the letter cards
                const letter = dropZone.textContent;
                const letterCard = document.createElement('div');
                letterCard.className = 'letter-card';
                letterCard.textContent = letter;
                letterCard.draggable = true;
                letterCard.dataset.index = document.querySelectorAll('.letter-card').length;
                
                letterCard.addEventListener('dragstart', handleDragStart);
                letterCard.addEventListener('dragend', handleDragEnd);
                
                document.getElementById('letter-cards').appendChild(letterCard);
                
                // Clear the drop zone
                dropZone.textContent = '';
                dropZone.dataset.letter = '';
                
                // Hide check button if not all zones are filled
                document.getElementById('check-word').classList.add('hidden');
            }
        });
        
        dropZones.appendChild(dropZone);
    }
    
    // Create letter cards
    const letters = gameState.currentWord.en.split('');
    shuffleArray(letters);
    
    const letterCards = document.getElementById('letter-cards');
    letters.forEach((letter, index) => {
        const card = document.createElement('div');
        card.className = 'letter-card';
        card.textContent = letter;
        card.draggable = true;
        card.dataset.index = index;
        
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        
        // Add click handler to place letter in first empty drop zone
        card.addEventListener('click', () => {
            const emptyDropZone = document.querySelector('.drop-zone:empty');
            if (emptyDropZone) {
                emptyDropZone.textContent = letter;
                emptyDropZone.dataset.letter = letter;
                card.remove();
                
                // Check if all drop zones are filled
                const allFilled = Array.from(document.querySelectorAll('.drop-zone'))
                    .every(zone => zone.textContent);
                    
                if (allFilled) {
                    document.getElementById('check-word').classList.remove('hidden');
                }
            }
        });
        
        letterCards.appendChild(card);
    });
    
    // Add drop zone event listeners
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('drop', handleDrop);
    });
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Drag and drop handlers
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.textContent);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.target;
    const letter = e.dataTransfer.getData('text/plain');
    
    if (dropZone.classList.contains('drop-zone')) {
        // If the drop zone already has a letter, return it to the letter cards
        if (dropZone.textContent) {
            const oldLetter = dropZone.textContent;
            const letterCard = document.createElement('div');
            letterCard.className = 'letter-card';
            letterCard.textContent = oldLetter;
            letterCard.draggable = true;
            letterCard.dataset.index = document.querySelectorAll('.letter-card').length;
            
            letterCard.addEventListener('dragstart', handleDragStart);
            letterCard.addEventListener('dragend', handleDragEnd);
            
            document.getElementById('letter-cards').appendChild(letterCard);
        }
        
        dropZone.textContent = letter;
        dropZone.dataset.letter = letter;
        
        // Remove the dragged letter card
        const draggedCard = document.querySelector('.dragging');
        if (draggedCard) {
            draggedCard.remove();
        }
        
        // Check if all drop zones are filled
        const allFilled = Array.from(document.querySelectorAll('.drop-zone'))
            .every(zone => zone.textContent);
            
        if (allFilled) {
            document.getElementById('check-word').classList.remove('hidden');
        }
    }
}

// Check the word
function checkWord() {
    // Safety check - ensure we have a valid current word
    if (!gameState.currentWord || !gameState.currentWord.en) {
        console.error('No current word selected. Please select a topic first.');
        return;
    }

    const dropZones = document.querySelectorAll('.drop-zone');
    const enteredWord = Array.from(dropZones)
        .map(zone => zone.textContent)
        .join('');
    
    const resultMessage = document.getElementById('result-message');
    const errorGif = document.getElementById('error-gif');
    const successGif = document.getElementById('success-gif');
    const successSound = document.getElementById('success-sound');
    const failSound = document.getElementById('fail-sound');
    const completionSound = document.getElementById('completion-sound');
    
    if (enteredWord === gameState.currentWord.en) {
        resultMessage.textContent = 'Correct! Well done!';
        resultMessage.style.color = 'green';
        errorGif.classList.add('hidden');
        successGif.classList.remove('hidden');
        
        // Play success sound
        successSound.currentTime = 0; // Reset sound to start
        successSound.play();
        
        // Add word to completed words
        gameState.completedWords.add(gameState.currentWord.en);
        
        // Update topic progress
        const topicId = gameState.currentTopic.id;
        gameState.topicProgress[topicId].completed++;
        
        // Check if topic is completed
        if (gameState.topicProgress[topicId].completed === gameState.topicProgress[topicId].total) {
            gameState.completedTopics.add(topicId);
            // Play completion sound
            completionSound.currentTime = 0;
            completionSound.play();
            
            // Immediately show completion state
            // Clear game area
            document.getElementById('drop-zones').innerHTML = '';
            document.getElementById('letter-cards').innerHTML = '';
            document.getElementById('result-message').textContent = '';
            document.getElementById('check-word').classList.add('hidden');
            
            // Hide other GIFs
            document.getElementById('error-gif').classList.add('hidden');
            document.getElementById('success-gif').classList.add('hidden');
            
            // Show completion message and GIF
            document.getElementById('translation').textContent = 'All done here!';
            document.getElementById('completion-gif').classList.remove('hidden');
            
            // Save progress and update UI
            savePlayerData();
            renderTopics();
        } else {
            // Save progress
            savePlayerData();
            renderTopics();
            
            // Start new word after a delay
            setTimeout(() => {
                successGif.classList.add('hidden');
                startNewWord();
            }, 2000);
        }
    } else {
        resultMessage.textContent = `Incorrect. The correct word is: ${gameState.currentWord.en}`;
        resultMessage.style.color = 'red';
        errorGif.classList.remove('hidden');
        successGif.classList.add('hidden');
        
        // Play fail sound
        failSound.currentTime = 0; // Reset sound to start
        failSound.play();
        
        // Show correct word in drop zones
        dropZones.forEach((zone, index) => {
            zone.textContent = gameState.currentWord.en[index];
        });
        
        // Start new word after a delay
        setTimeout(() => {
            errorGif.classList.add('hidden');
            startNewWord();
        }, 3000);
    }
}

// --- GROUPS CONFIG ---
const GROUPS = [
  { name: 'English', file: 'data/english_lessons.json', type: 'english' },
  { name: 'Math', file: 'data/math_lessons.json', type: 'math' }
];

// --- UI: Render Accordion ---
function renderAccordion() {
  const groupsAccordionMobile = document.getElementById('groupsAccordionMobile');
  const groupsAccordionDesktop = document.getElementById('groupsAccordionDesktop');
  if (!groupsAccordionMobile || !groupsAccordionDesktop) return;

  groupsAccordionMobile.innerHTML = '';
  groupsAccordionDesktop.innerHTML = '';

  GROUPS.forEach((group, groupIdx) => {
    // Accordion header
    const groupHeader = document.createElement('h2');
    groupHeader.className = 'accordion-header';
    groupHeader.id = `groupHeading${groupIdx}`;

    const groupBtn = document.createElement('button');
    groupBtn.className = 'accordion-button collapsed';
    groupBtn.type = 'button';
    groupBtn.setAttribute('data-bs-toggle', 'collapse');
    groupBtn.setAttribute('data-bs-target', `#groupCollapseMobile${groupIdx}`);
    groupBtn.setAttribute('aria-expanded', 'false');
    groupBtn.setAttribute('aria-controls', `groupCollapseMobile${groupIdx}`);
    groupBtn.textContent = group.name;
    groupHeader.appendChild(groupBtn);

    const groupHeaderDesktop = groupHeader.cloneNode(true);
    const groupBtnDesktop = groupHeaderDesktop.querySelector('button');
    groupBtnDesktop.setAttribute('data-bs-target', `#groupCollapseDesktop${groupIdx}`);
    groupBtnDesktop.setAttribute('aria-controls', `groupCollapseDesktop${groupIdx}`);

    // Accordion body
    const groupBody = document.createElement('div');
    groupBody.id = `groupCollapseMobile${groupIdx}`;
    groupBody.className = 'accordion-collapse collapse';
    groupBody.setAttribute('aria-labelledby', `groupHeading${groupIdx}`);
    groupBody.setAttribute('data-bs-parent', '#groupsAccordionMobile');
    const groupBodyDesktop = groupBody.cloneNode(true);
    groupBodyDesktop.id = `groupCollapseDesktop${groupIdx}`;
    groupBodyDesktop.setAttribute('data-bs-parent', '#groupsAccordionDesktop');

    // Lessons list
    const lessonsList = document.createElement('div');
    lessonsList.className = 'list-group';
    const lessonsListDesktop = lessonsList.cloneNode(true);

    // Load lessons for this group
    fetch(group.file)
      .then(res => res.json())
      .then(data => {
        (data.lessons || []).forEach(lesson => {
          const lessonItem = document.createElement('button');
          lessonItem.className = 'list-group-item list-group-item-action';
          lessonItem.textContent = lesson.name;
          lessonItem.onclick = () => selectLesson(group, lesson);
          lessonsList.appendChild(lessonItem);

          const lessonItemDesktop = lessonItem.cloneNode(true);
          lessonItemDesktop.onclick = () => selectLesson(group, lesson);
          lessonsListDesktop.appendChild(lessonItemDesktop);
        });
      });

    groupBody.appendChild(lessonsList);
    groupBodyDesktop.appendChild(lessonsListDesktop);

    // Wrap in accordion item
    const accordionItem = document.createElement('div');
    accordionItem.className = 'accordion-item';
    accordionItem.appendChild(groupHeader);
    accordionItem.appendChild(groupBody);
    groupsAccordionMobile.appendChild(accordionItem);

    const accordionItemDesktop = document.createElement('div');
    accordionItemDesktop.className = 'accordion-item';
    accordionItemDesktop.appendChild(groupHeaderDesktop);
    accordionItemDesktop.appendChild(groupBodyDesktop);
    groupsAccordionDesktop.appendChild(accordionItemDesktop);
  });
}

// --- Select Lesson Handler ---
function selectLesson(group, lesson) {
  gameState.currentGroup = group;
  gameState.currentLesson = lesson;
  if (group.type === 'english') {
    // Use your existing logic for English lessons
    gameState.currentTopic = lesson;
    gameState.completedWords.clear();
    document.getElementById('completion-gif').classList.add('hidden');
    startNewWord();
  } else if (group.type === 'math') {
    // Render math game (to be implemented)
    renderMathGame(lesson);
  }
}

// --- Render Math Game (Stub) ---
function renderMathGame(lesson) {
  // Clear game area
  document.getElementById('translation').textContent = '';
  document.getElementById('drop-zones').innerHTML = '';
  document.getElementById('letter-cards').innerHTML = '';
  document.getElementById('result-message').textContent = '';
  document.getElementById('check-word').classList.add('hidden');
  document.getElementById('error-gif').classList.add('hidden');
  document.getElementById('success-gif').classList.add('hidden');
  document.getElementById('completion-gif').classList.add('hidden');

  // Math quiz state
  if (!lesson._mathState) {
    lesson._mathState = { current: 0, correct: 0 };
  }
  const state = lesson._mathState;
  const tasks = lesson.tasks;

  // If all tasks are done
  if (state.current >= tasks.length) {
    document.getElementById('translation').textContent = 'All done!';
    document.getElementById('result-message').textContent = `You answered ${state.correct} out of ${tasks.length} correctly!`;
    document.getElementById('completion-gif').classList.remove('hidden');
    const completionSound = document.getElementById('completion-sound');
    if (completionSound) {
      completionSound.currentTime = 0;
      completionSound.play();
    }
    // Add Start Again button
    const dropZones = document.getElementById('drop-zones');
    dropZones.innerHTML = '';
    const againBtn = document.createElement('button');
    againBtn.className = 'btn btn-primary mt-3';
    againBtn.textContent = 'Start Again';
    againBtn.onclick = () => {
      lesson._mathState = { current: 0, correct: 0 };
      renderMathGame(lesson);
    };
    dropZones.appendChild(againBtn);
    return;
  }

  // Show current task
  const task = tasks[state.current];
  document.getElementById('translation').textContent = `${task.a} × ${task.b} = ?`;

  // Generate 6 answer options (1 correct, 5 unique wrong)
  const correct = task.a * task.b;
  const options = new Set([correct]);
  while (options.size < 6) {
    // Generate plausible wrong answers
    let wrong = correct + Math.floor(Math.random() * 11) - 5; // +/-5
    if (wrong === correct || wrong < 0) wrong = correct + Math.floor(Math.random() * 10) + 1;
    options.add(wrong);
  }
  const shuffled = Array.from(options);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Show answer cards
  const dropZones = document.getElementById('drop-zones');
  dropZones.innerHTML = '';
  const cardsRow = document.createElement('div');
  cardsRow.className = 'd-flex flex-wrap justify-content-center gap-3';
  shuffled.forEach(option => {
    const card = document.createElement('button');
    card.className = 'btn btn-outline-primary fs-4 py-3 px-4 answer-card';
    card.textContent = option;
    card.disabled = false;
    card.onclick = () => {
      if (option === correct) {
        card.classList.remove('btn-outline-primary');
        card.classList.add('btn-success');
        document.getElementById('result-message').textContent = 'Correct!';
        document.getElementById('result-message').style.color = 'green';
        document.getElementById('success-gif').classList.remove('hidden');
        const successSound = document.getElementById('success-sound');
        if (successSound) {
          successSound.currentTime = 0;
          successSound.play();
        }
        state.correct++;
        // Disable all cards
        cardsRow.querySelectorAll('button').forEach(btn => btn.disabled = true);
        setTimeout(() => {
          document.getElementById('success-gif').classList.add('hidden');
          state.current++;
          renderMathGame(lesson);
        }, 1500);
      } else {
        card.classList.remove('btn-outline-primary');
        card.classList.add('btn-danger');
        card.disabled = true;
        document.getElementById('result-message').textContent = 'Try again!';
        document.getElementById('result-message').style.color = 'red';
        document.getElementById('error-gif').classList.remove('hidden');
        const failSound = document.getElementById('fail-sound');
        if (failSound) {
          failSound.currentTime = 0;
          failSound.play();
        }
        setTimeout(() => {
          document.getElementById('error-gif').classList.add('hidden');
        }, 1000);
      }
    };
    cardsRow.appendChild(card);
  });
  dropZones.appendChild(cardsRow);
  document.getElementById('result-message').textContent = '';
}

// --- On page load, render accordion ---
document.addEventListener('DOMContentLoaded', () => {
  renderAccordion();
  initGame();
  document.getElementById('check-word').addEventListener('click', checkWord);
}); 