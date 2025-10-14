/**
 * Testing Helper Script
 * 
 * Copy-paste these functions into the DevTools Console
 * to test Day 2 features easily.
 * 
 * Usage:
 * 1. Load the extension in Chrome
 * 2. Go to any webpage
 * 3. Open DevTools Console (F12)
 * 4. Copy-paste this entire file
 * 5. Run test functions
 */

// ======================
// NOTIFICATION TESTS
// ======================

/**
 * Test success notification
 */
function testSuccessNotification() {
  const notification = document.createElement('div');
  notification.className = 'stupify-notification';
  notification.setAttribute('data-type', 'success');
  notification.textContent = '✅ Success! This is a success notification.';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'stupify-slide-out 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  console.log('✅ Success notification displayed');
}

/**
 * Test warning notification
 */
function testWarningNotification() {
  const notification = document.createElement('div');
  notification.className = 'stupify-notification';
  notification.setAttribute('data-type', 'warning');
  notification.textContent = '⚠️ Warning! Please select at least 10 characters.';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'stupify-slide-out 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  console.log('⚠️ Warning notification displayed');
}

/**
 * Test error notification
 */
function testErrorNotification() {
  const notification = document.createElement('div');
  notification.className = 'stupify-notification';
  notification.setAttribute('data-type', 'error');
  notification.textContent = '❌ Error! Something went wrong. Please try again.';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'stupify-slide-out 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  console.log('❌ Error notification displayed');
}

/**
 * Test info notification
 */
function testInfoNotification() {
  const notification = document.createElement('div');
  notification.className = 'stupify-notification';
  notification.setAttribute('data-type', 'info');
  notification.textContent = 'ℹ️ Tip: Press Cmd+Shift+S to simplify selected text!';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'stupify-slide-out 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  console.log('ℹ️ Info notification displayed');
}

// ======================
// STORAGE TESTS
// ======================

/**
 * View all chrome storage data
 */
function viewStorage() {
  chrome.storage.local.get(null, (data) => {
    console.log('📦 Chrome Storage Contents:');
    console.table(data);
  });
}

/**
 * View current selection
 */
function viewSelection() {
  chrome.storage.local.get('currentSelection', (data) => {
    console.log('✂️ Current Selection:');
    console.log(data.currentSelection);
  });
}

/**
 * Clear all storage (use with caution!)
 */
function clearStorage() {
  if (confirm('⚠️ Clear all storage? This will reset everything.')) {
    chrome.storage.local.clear(() => {
      console.log('🗑️ Storage cleared');
    });
  }
}

/**
 * View analytics event queue
 */
function viewEventQueue() {
  chrome.storage.local.get('eventQueue', (data) => {
    console.log('📊 Analytics Event Queue:');
    console.table(data.eventQueue || []);
  });
}

/**
 * Clear event queue
 */
function clearEventQueue() {
  chrome.storage.local.set({ eventQueue: [] }, () => {
    console.log('🗑️ Event queue cleared');
  });
}

// ======================
// SELECTION TESTS
// ======================

/**
 * Get current window selection
 */
function getSelection() {
  const selection = window.getSelection();
  const text = selection?.toString().trim() || '';
  
  console.log('✂️ Current Selection:');
  console.log({
    text: text,
    length: text.length,
    valid: text.length >= 10 && text.length <= 5000,
  });
  
  return text;
}

/**
 * Test selection with mock text
 */
function testSelection(text = 'This is a test selection with enough characters to be valid.') {
  // Create a temporary element with text
  const div = document.createElement('div');
  div.textContent = text;
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  document.body.appendChild(div);
  
  // Select the text
  const range = document.createRange();
  range.selectNodeContents(div);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  
  console.log('✂️ Mock selection created:', {
    text: text.substring(0, 50) + '...',
    length: text.length,
  });
  
  // Clean up after 2 seconds
  setTimeout(() => {
    div.remove();
    selection?.removeAllRanges();
    console.log('🗑️ Mock selection cleaned up');
  }, 2000);
}

// ======================
// MESSAGE TESTS
// ======================

/**
 * Send test message to background
 */
function testMessage(type = 'TRACK_EVENT', payload = { event: 'test_event' }) {
  chrome.runtime.sendMessage(
    { type, payload },
    (response) => {
      console.log('📨 Message sent:', { type, payload });
      console.log('📬 Response:', response);
    }
  );
}

/**
 * Test analytics tracking
 */
function testAnalytics() {
  chrome.runtime.sendMessage(
    {
      type: 'TRACK_EVENT',
      payload: {
        event: 'test_event',
        properties: {
          test: true,
          timestamp: Date.now(),
        },
      },
    },
    (response) => {
      console.log('📊 Analytics test:', response);
    }
  );
}

// ======================
// PERFORMANCE TESTS
// ======================

/**
 * Test rapid selection (stress test)
 */
function testRapidSelection() {
  console.log('⚡ Starting rapid selection test...');
  
  const texts = [
    'Short text one',
    'This is a longer text with more characters',
    'Another selection',
    'Yet another piece of text',
    'Final test selection',
  ];
  
  let count = 0;
  const interval = setInterval(() => {
    if (count >= texts.length) {
      clearInterval(interval);
      console.log('✅ Rapid selection test complete');
      return;
    }
    
    testSelection(texts[count]);
    count++;
  }, 500);
}

/**
 * Measure memory usage
 */
function testMemory() {
  if (performance.memory) {
    console.log('💾 Memory Usage:', {
      used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
    });
  } else {
    console.log('⚠️ Memory API not available (Chrome only)');
  }
}

// ======================
// INTEGRATION TESTS
// ======================

/**
 * Run all tests sequentially
 */
async function runAllTests() {
  console.log('🧪 Running all tests...\n');
  
  console.log('1️⃣ Testing notifications...');
  testSuccessNotification();
  await sleep(4000);
  
  testWarningNotification();
  await sleep(4000);
  
  testErrorNotification();
  await sleep(4000);
  
  console.log('\n2️⃣ Testing storage...');
  viewStorage();
  await sleep(1000);
  
  console.log('\n3️⃣ Testing selection...');
  testSelection();
  await sleep(3000);
  
  console.log('\n4️⃣ Testing messages...');
  testAnalytics();
  await sleep(1000);
  
  console.log('\n5️⃣ Testing memory...');
  testMemory();
  
  console.log('\n✅ All tests complete!');
}

/**
 * Helper: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================
// QUICK TESTS
// ======================

/**
 * Quick test - Run most common tests
 */
function quickTest() {
  console.log('⚡ Quick Test\n');
  
  console.log('1. Notifications:');
  testSuccessNotification();
  
  setTimeout(() => {
    console.log('\n2. Storage:');
    viewStorage();
    
    console.log('\n3. Event Queue:');
    viewEventQueue();
    
    console.log('\n4. Memory:');
    testMemory();
    
    console.log('\n✅ Quick test complete!');
  }, 4000);
}

// ======================
// INSTRUCTIONS
// ======================

console.log(`
🧪 STUPIFY EXTENSION - TEST HELPERS LOADED

Quick Start:
  quickTest()              - Run most common tests
  runAllTests()            - Run all tests (takes ~20s)

Notifications:
  testSuccessNotification() - Show success notification
  testWarningNotification() - Show warning notification  
  testErrorNotification()   - Show error notification
  testInfoNotification()    - Show info notification

Storage:
  viewStorage()            - View all chrome storage
  viewSelection()          - View current selection
  clearStorage()           - Clear all storage (⚠️ CAUTION)
  viewEventQueue()         - View analytics events
  clearEventQueue()        - Clear event queue

Selection:
  getSelection()           - Get current selection
  testSelection('text')    - Create mock selection
  testRapidSelection()     - Stress test

Messages:
  testMessage()            - Send test message
  testAnalytics()          - Test analytics tracking

Performance:
  testMemory()             - Check memory usage

📝 Example:
  > quickTest()
  > testSuccessNotification()
  > viewStorage()

Happy testing! 🚀
`);

// Auto-run quick test in 3 seconds if desired
// Uncomment the line below:
// setTimeout(quickTest, 3000);