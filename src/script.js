// Frontend logic for Vocabulary App running on Cloudflare Workers backend
// Author: AI

const API_BASE = '/api';

// Helper to simplify fetch with JSON
async function api(path, method = 'GET', data) {
  const opts = {method, headers: {}};
  if (data) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Request failed');
  }
  return res.json();
}

// Rating helpers (same logic as Python version)
function getRatingColor(rating) {
  if (rating < 1200) return '#808080';
  if (rating < 1400) return '#008000';
  if (rating < 1600) return '#03899e';
  if (rating < 1900) return '#0000FF';
  if (rating < 2100) return '#aa00aa';
  if (rating < 2400) return '#FF8C00';
  if (rating < 2600) return '#FF0000';
  if (rating < 3000) return '#FF0000';
  if (rating < 4000) return '#000000';
  return '#FF0000';
}

function getRatingTitle(rating) {
  if (rating < 1200) return 'Newbie';
  if (rating < 1400) return 'Pupil';
  if (rating < 1600) return 'Specialist';
  if (rating < 1900) return 'Expert';
  if (rating < 2100) return 'Candidate Master';
  if (rating < 2300) return 'Master';
  if (rating < 2400) return 'International Master';
  if (rating < 2600) return 'Grandmaster';
  if (rating < 3000) return 'International Grandmaster';
  if (rating < 4000) return 'Legendary Grandmaster';
  return 'Tourist';
}

async function loadSections() {
  const data = await api('/sections');
  const select = document.getElementById('sections-select');
  select.innerHTML = '';
  data.forEach(sec => {
    const option = document.createElement('option');
    option.value = sec.id;
    option.textContent = `集合 ${sec.id} (${sec.count}个单词)`;
    select.appendChild(option);
  });
}

async function addSection() {
  const id = prompt('请输入新的集合编号:');
  if (!id) return;
  await api('/sections', 'POST', {section: id.trim()});
  await loadSections();
}

async function deleteSection() {
  const select = document.getElementById('sections-select');
  const selected = Array.from(select.selectedOptions).map(o => o.value);
  if (!selected.length) {alert('请选择集合'); return;}
  if (!confirm('确定要删除选中的集合吗？')) return;
  for (const sec of selected) {
    await api('/sections', 'DELETE', {section: sec});
  }
  await loadSections();
}

async function addWord() {
  const select = document.getElementById('sections-select');
  if (select.selectedOptions.length !== 1) {
    alert('请先选择一个集合');
    return;
  }
  const section = select.value;
  const chinese = prompt('请输入中文:');
  if (!chinese) return;
  const english = prompt('请输入英文:');
  if (!english) return;
  await api('/vocab', 'POST', {section, chinese, english});
  alert('添加成功');
  await loadSections();
}

async function deleteWord() {
  const select = document.getElementById('sections-select');
  if (select.selectedOptions.length !== 1) {
    alert('请先选择一个集合');
    return;
  }
  const section = select.value;
  // 获取词表
  const words = await api(`/vocab/${section}`);
  const list = Object.entries(words);
  if (!list.length) {
    alert('集合为空');
    return;
  }
  const chinese = prompt(`请输入要删除的中文单词 (可用逗号分隔多词):\n${list.map(([c,e]) => c+'='+e).join('\n')}`);
  if (!chinese) return;
  const arr = chinese.split(',').map(s=>s.trim()).filter(Boolean);
  for (const c of arr) {
    await api('/vocab', 'DELETE', {section, chinese: c});
  }
  alert('删除成功');
}

async function showMistakes() {
  const data = await api('/mistakes');
  alert(JSON.stringify(data, null, 2));
}

async function resetMistakes() {
  if (!confirm('确定重置所有错误计数？')) return;
  await api('/mistakes/reset', 'POST');
  alert('已重置');
}

// Simple test logic
let currentWords = [];
let currentIndex = 0;
let correctCount = 0;
let wrongWords = [];
let currentAttempts = 0;
let ratedTest = false;

function updateProgress() {
  document.getElementById('progress-label').textContent = `单词 ${currentIndex+1}/${currentWords.length}`;
}

function showQuestion() {
  if (currentIndex >= currentWords.length) {endTest(); return;}
  currentAttempts = 0;
  const [chinese] = currentWords[currentIndex];
  document.getElementById('question-label').textContent = `${chinese} 的英文是？`;
  document.getElementById('answer-input').value = '';
  document.getElementById('feedback-label').textContent = '';
  document.getElementById('hint-label').textContent = '';
  updateProgress();
  document.getElementById('answer-input').focus();
}

function startTest() {
  const select = document.getElementById('sections-select');
  const sections = Array.from(select.selectedOptions).map(o=>o.value);
  if (!sections.length) {alert('请选择集合'); return;}
  api('/start-test', 'POST', {sections}).then(data=>{
    currentWords = data.words; // [[chinese, english, section]]
    ratedTest = data.rated;
    correctCount = 0;
    wrongWords = [];
    currentIndex = 0;
    document.getElementById('test-info').textContent = `${ratedTest?'评级测试':'普通测试'}: ${sections.join(', ')} | 单词总数: ${currentWords.length}`;
    showQuestion();
  });
}

function checkAnswer() {
  const answer = document.getElementById('answer-input').value.trim();
  if (!answer) {alert('请输入'); return;}
  const [chinese, english, section] = currentWords[currentIndex];
  currentAttempts++;
  if (answer.toLowerCase() === english.toLowerCase()) {
    document.getElementById('feedback-label').textContent = '✅ Accepted!';
    correctCount++;
    currentIndex++;
    setTimeout(showQuestion, 300);
  } else {
    if (currentAttempts < 3) {
      document.getElementById('feedback-label').textContent = '❌ Try again!';
      if (currentAttempts === 1) {
        document.getElementById('hint-label').textContent = `提示: 单词长度 ${english.length}`;
      } else if (currentAttempts === 2) {
        document.getElementById('hint-label').textContent = `提示: 首字母 ${english[0].toUpperCase()}`;
      }
    } else {
      document.getElementById('feedback-label').textContent = `❌ Wrong! 正确答案: ${english}`;
      wrongWords.push([chinese, english, section]);
      // tell backend to increment mistake
      api('/mistakes', 'POST', {chinese, section});
      currentIndex++;
      setTimeout(showQuestion, 1000);
    }
  }
}

function endTest() {
  document.getElementById('question-label').textContent = '测试结束!';
  document.getElementById('progress-label').textContent = '';
  document.getElementById('hint-label').textContent = '';
  document.getElementById('feedback-label').textContent = '';
  const total = currentWords.length;
  const accuracy = total ? (correctCount/total*100).toFixed(1) : 0;
  let resultHtml = `<p>共 ${total} 个单词，正确 ${correctCount}，正确率 ${accuracy}%</p>`;
  if (wrongWords.length) {
    resultHtml += '<h3>错误单词:</h3><ul>' + wrongWords.map(w=>`<li>${w[0]} = ${w[1]}</li>`).join('') + '</ul>';
  }
  document.getElementById('result-content').innerHTML = resultHtml;
}

function bindEvents() {
  document.getElementById('add-section-btn').addEventListener('click', addSection);
  document.getElementById('delete-section-btn').addEventListener('click', deleteSection);
  document.getElementById('add-word-btn').addEventListener('click', addWord);
  document.getElementById('delete-word-btn').addEventListener('click', deleteWord);
  document.getElementById('start-test-btn').addEventListener('click', startTest);
  document.getElementById('reset-mistakes-btn').addEventListener('click', resetMistakes);
  document.getElementById('show-mistakes-btn').addEventListener('click', showMistakes);
  document.getElementById('check-btn').addEventListener('click', checkAnswer);
  document.getElementById('answer-input').addEventListener('keydown', e=>{if(e.key==='Enter') checkAnswer();});
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadSections();
}); 