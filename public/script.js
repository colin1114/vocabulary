// Frontend logic for Vocabulary App running on Cloudflare Workers backend
// Author: AI

const API_BASE = '/api';

// 添加加载动画
function showLoading() {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading-overlay';
  loadingEl.innerHTML = `
    <div class="spinner">
      <div class="bounce1"></div>
      <div class="bounce2"></div>
      <div class="bounce3"></div>
    </div>
  `;
  document.body.appendChild(loadingEl);
  return loadingEl;
}

function hideLoading(loadingEl) {
  if (loadingEl) {
    loadingEl.classList.add('fade-out');
    setTimeout(() => {
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
      }
    }, 300);
  }
}

// 显示通知消息
function showNotification(message, type = 'info') {
  const notifEl = document.createElement('div');
  notifEl.className = `notification ${type}`;
  notifEl.textContent = message;
  document.body.appendChild(notifEl);
  
  // 动画显示
  setTimeout(() => notifEl.classList.add('show'), 10);
  
  // 自动消失
  setTimeout(() => {
    notifEl.classList.remove('show');
    setTimeout(() => {
      if (notifEl.parentNode) {
        notifEl.parentNode.removeChild(notifEl);
      }
    }, 300);
  }, 3000);
}

// Helper to simplify fetch with JSON
async function api(path, method = 'GET', data) {
  const loading = showLoading();
  const opts = {method, headers: {}};
  if (data) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);
  }
  
  try {
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Request failed');
    }
    const result = await res.json();
    hideLoading(loading);
    return result;
  } catch (err) {
    hideLoading(loading);
    showNotification(err.message, 'error');
    console.error(`API错误: ${path}`, err);
    throw err;
  }
}

// 模态框管理
const modal = {
  el: document.getElementById('modal'),
  titleEl: document.getElementById('modal-title'),
  bodyEl: document.getElementById('modal-body'),
  
  show(title, content) {
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = content;
    this.el.style.display = 'block';
    setTimeout(() => this.el.classList.add('show'), 10);
    
    // 关闭按钮事件
    const closeBtn = this.el.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => this.hide();
    }
    
    // 点击背景关闭
    this.el.onclick = (e) => {
      if (e.target === this.el) this.hide();
    };
    
    // ESC关闭
    document.addEventListener('keydown', this.escListener);
  },
  
  hide() {
    this.el.classList.remove('show');
    setTimeout(() => {
      this.el.style.display = 'none';
      this.bodyEl.innerHTML = '';
    }, 300);
    document.removeEventListener('keydown', this.escListener);
  },
  
  escListener: function(e) {
    if (e.key === 'Escape') modal.hide();
  }
};

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
  try {
    const data = await api('/sections');
    const select = document.getElementById('sections-select');
    
    // 添加淡入动画
    select.style.opacity = '0';
    select.innerHTML = '';
    
    if (data.length === 0) {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = '没有可用的集合，请添加一个';
      select.appendChild(option);
    } else {
      data.forEach(sec => {
        const option = document.createElement('option');
        option.value = sec.id;
        option.textContent = `集合 ${sec.id} (${sec.count}个单词)`;
        select.appendChild(option);
      });
    }
    
    // 淡入显示
    setTimeout(() => {
      select.style.transition = 'opacity 0.5s';
      select.style.opacity = '1';
    }, 10);
    
    return data;
  } catch (err) {
    console.error('加载集合失败:', err);
    return [];
  }
}

async function addSection() {
  // 创建表单
  const formHTML = `
    <div class="form-group">
      <label for="section-id">集合编号:</label>
      <input type="text" id="section-id" placeholder="请输入集合编号" autofocus>
    </div>
    <div class="form-buttons">
      <button id="cancel-btn">取消</button>
      <button id="submit-btn" class="accent-btn">添加</button>
    </div>
  `;
  
  modal.show('添加新集合', formHTML);
  
  // 绑定事件
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const input = document.getElementById('section-id');
  
  cancelBtn.onclick = () => modal.hide();
  
  submitBtn.onclick = async () => {
    const sectionId = input.value.trim();
    if (!sectionId) {
      input.classList.add('error');
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
      return;
    }
    
    try {
      await api('/sections', 'POST', { section: sectionId });
      modal.hide();
      showNotification(`集合 ${sectionId} 添加成功`, 'success');
      loadSections();
    } catch (err) {
      console.error('添加集合失败:', err);
    }
  };
  
  // 回车提交
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') submitBtn.click();
  });
}

async function deleteSection() {
  const sections = document.getElementById('sections-select');
  const selected = Array.from(sections.selectedOptions).map(opt => opt.value);
  
  if (selected.length === 0) {
    showNotification('请先选择要删除的集合', 'warning');
    return;
  }
  
  // 创建确认对话框
  const formHTML = `
    <div class="delete-list">
      <p>确定要删除以下集合吗？此操作不可撤销。</p>
      <ul>
        ${selected.map(id => `<li>集合 ${id}</li>`).join('')}
      </ul>
    </div>
    <div class="form-buttons">
      <button id="cancel-btn">取消</button>
      <button id="confirm-btn" class="danger-btn">确认删除</button>
    </div>
  `;
  
  modal.show('删除集合', formHTML);
  
  // 绑定事件
  document.getElementById('cancel-btn').onclick = () => modal.hide();
  document.getElementById('confirm-btn').onclick = async () => {
    try {
      for (const id of selected) {
        await api('/sections', 'DELETE', { section: id });
      }
      modal.hide();
      showNotification(`已删除 ${selected.length} 个集合`, 'success');
      loadSections();
    } catch (err) {
      console.error('删除集合失败:', err);
    }
  };
}

async function addWord() {
  const sections = document.getElementById('sections-select');
  const selected = Array.from(sections.selectedOptions).map(opt => opt.value);
  
  if (selected.length !== 1) {
    showNotification('请先选择一个集合', 'warning');
    return;
  }
  
  const section = selected[0];
  
  // 创建表单
  const formHTML = `
    <div class="form-group">
      <label for="chinese-word">中文:</label>
      <input type="text" id="chinese-word" placeholder="请输入中文" autofocus>
    </div>
    <div class="form-group">
      <label for="english-word">英文:</label>
      <input type="text" id="english-word" placeholder="请输入英文">
    </div>
    <div class="form-buttons">
      <button id="cancel-btn">取消</button>
      <button id="submit-btn" class="accent-btn">添加</button>
    </div>
  `;
  
  modal.show(`添加单词到集合 ${section}`, formHTML);
  
  // 绑定事件
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const chineseInput = document.getElementById('chinese-word');
  const englishInput = document.getElementById('english-word');
  
  cancelBtn.onclick = () => modal.hide();
  
  submitBtn.onclick = async () => {
    const chinese = chineseInput.value.trim();
    const english = englishInput.value.trim();
    
    if (!chinese || !english) {
      if (!chinese) {
        chineseInput.classList.add('error');
        chineseInput.classList.add('shake');
        setTimeout(() => chineseInput.classList.remove('shake'), 500);
      }
      if (!english) {
        englishInput.classList.add('error');
        englishInput.classList.add('shake');
        setTimeout(() => englishInput.classList.remove('shake'), 500);
      }
      return;
    }
    
    try {
      await api('/vocab', 'POST', { section, chinese, english });
      modal.hide();
      showNotification(`单词 "${chinese}" 添加成功`, 'success');
      loadSections(); // 刷新计数
    } catch (err) {
      console.error('添加单词失败:', err);
    }
  };
}

async function deleteWord() {
  const sections = document.getElementById('sections-select');
  const selected = Array.from(sections.selectedOptions).map(opt => opt.value);
  
  if (selected.length !== 1) {
    showNotification('请先选择一个集合', 'warning');
    return;
  }
  
  const section = selected[0];
  
  try {
    // 获取集合中的单词
    const words = await api(`/vocab/${encodeURIComponent(section)}`);
    
    if (Object.keys(words).length === 0) {
      showNotification(`集合 ${section} 中没有单词`, 'info');
      return;
    }
    
    // 创建单词列表
    const formHTML = `
      <div class="word-list">
        <p>请选择要删除的单词:</p>
        ${Object.entries(words).map(([ch, en]) => `
          <div class="word-item">
            <input type="checkbox" id="word-${ch}" data-chinese="${ch}">
            <label for="word-${ch}">${ch} - ${en}</label>
          </div>
        `).join('')}
      </div>
      <div class="form-buttons">
        <button id="cancel-btn">取消</button>
        <button id="confirm-btn" class="danger-btn">删除选中</button>
      </div>
    `;
    
    modal.show(`从集合 ${section} 中删除单词`, formHTML);
    
    // 绑定事件
    document.getElementById('cancel-btn').onclick = () => modal.hide();
    document.getElementById('confirm-btn').onclick = async () => {
      const selected = Array.from(document.querySelectorAll('.word-item input:checked'))
        .map(cb => cb.getAttribute('data-chinese'));
      
      if (selected.length === 0) {
        showNotification('请至少选择一个单词', 'warning');
        return;
      }
      
      try {
        for (const chinese of selected) {
          await api('/vocab', 'DELETE', { section, chinese });
        }
        modal.hide();
        showNotification(`已删除 ${selected.length} 个单词`, 'success');
        loadSections(); // 刷新计数
      } catch (err) {
        console.error('删除单词失败:', err);
      }
    };
    
  } catch (err) {
    console.error('获取单词列表失败:', err);
  }
}

async function showMistakes() {
  try {
    const mistakes = await api('/mistakes');
    const entries = Object.entries(mistakes);
    
    if (entries.length === 0) {
      showNotification('目前没有错误记录', 'info');
      return;
    }
    
    // 创建错误列表
    const formHTML = `
      <div class="mistakes-table">
        <div class="mistakes-header">
          <div class="col">中文</div>
          <div class="col">集合</div>
          <div class="col">错误次数</div>
        </div>
        ${entries.flatMap(([chinese, sections]) => 
          Object.entries(sections).map(([section, count]) => `
            <div class="mistakes-row">
              <div class="col">${chinese}</div>
              <div class="col">${section}</div>
              <div class="col error-count">${count}</div>
            </div>
          `)
        ).join('')}
      </div>
    `;
    
    modal.show('错误统计', formHTML);
    
  } catch (err) {
    console.error('获取错误统计失败:', err);
  }
}

async function resetMistakes() {
  // 创建确认对话框
  const formHTML = `
    <div>
      <p>确定要重置所有错误统计吗？此操作不可撤销。</p>
    </div>
    <div class="form-buttons">
      <button id="cancel-btn">取消</button>
      <button id="confirm-btn" class="danger-btn">确认重置</button>
    </div>
  `;
  
  modal.show('重置错误统计', formHTML);
  
  // 绑定事件
  document.getElementById('cancel-btn').onclick = () => modal.hide();
  document.getElementById('confirm-btn').onclick = async () => {
    try {
      await api('/mistakes/reset', 'POST');
      modal.hide();
      showNotification('错误统计已重置', 'success');
    } catch (err) {
      console.error('重置错误统计失败:', err);
    }
  };
}

// 测试状态
let testWords = [];
let currentIndex = 0;
let currentQuestion = null;
let correctCount = 0;
let wrongCount = 0;
let skippedCount = 0;
let wrongWords = [];

function updateProgress() {
  if (testWords.length === 0) return;
  
  const progressLabel = document.getElementById('progress-label');
  progressLabel.textContent = `${currentIndex + 1} / ${testWords.length}`;
}

function showQuestion() {
  if (currentIndex >= testWords.length) {
    endTest();
    return;
  }
  
  const [chinese, english, section] = testWords[currentIndex];
  currentQuestion = {
    chinese,
    english,
    section,
    attempts: 0,
    skipped: false
  };
  
  document.getElementById('question-label').textContent = chinese;
  document.getElementById('hint-label').textContent = '';
  document.getElementById('attempts-label').textContent = '';
  document.getElementById('feedback-label').textContent = '';
  
  const answerInput = document.getElementById('answer-input');
  answerInput.value = '';
  answerInput.classList.remove('correct', 'error');
  answerInput.focus();
  
  document.getElementById('skip-btn').style.display = 'none';
  
  updateProgress();
}

function showNextQuestion() {
  currentIndex++;
  showQuestion();
}

async function startTest() {
  const sections = document.getElementById('sections-select');
  const selected = Array.from(sections.selectedOptions).map(opt => opt.value);
  
  if (selected.length === 0) {
    showNotification('请先选择至少一个集合', 'warning');
    return;
  }
  
  try {
    const result = await api('/start-test', 'POST', { sections: selected });
    
    if (result.words.length === 0) {
      showNotification('选择的集合中没有单词', 'warning');
      return;
    }
    
    // 初始化测试
    testWords = result.words;
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    skippedCount = 0;
    wrongWords = [];
    
    // 更新UI
    document.querySelector('.question-frame').classList.add('test-active');
    document.getElementById('retry-btn').style.display = 'none';
    document.getElementById('result-content').innerHTML = '';
    
    // 显示第一个问题
    showQuestion();
    
  } catch (err) {
    console.error('开始测试失败:', err);
  }
}

async function checkAnswer() {
  if (!currentQuestion) return;
  
  const answerInput = document.getElementById('answer-input');
  const userAnswer = answerInput.value.trim().toLowerCase();
  const correctAnswer = currentQuestion.english.toLowerCase();
  
  if (userAnswer === '') {
    answerInput.classList.add('shake');
    setTimeout(() => answerInput.classList.remove('shake'), 500);
    return;
  }
  
  currentQuestion.attempts++;
  
  if (userAnswer === correctAnswer) {
    // 正确
    answerInput.classList.add('correct');
    document.getElementById('feedback-label').textContent = '正确!';
    document.getElementById('feedback-label').className = 'feedback-label success';
    
    if (currentQuestion.attempts === 1) {
      correctCount++;
    } else {
      // 多次尝试才正确，记录错误
      wrongCount++;
      wrongWords.push(currentQuestion);
      
      // 记录错误到服务器
      try {
        await api('/mistakes', 'POST', {
          chinese: currentQuestion.chinese,
          section: currentQuestion.section
        });
      } catch (err) {
        console.error('记录错误失败:', err);
      }
    }
    
    // 延迟显示下一题
    setTimeout(() => {
      showNextQuestion();
    }, 1000);
    
  } else {
    // 错误
    answerInput.classList.add('error');
    document.getElementById('feedback-label').textContent = '不正确，请重试';
    document.getElementById('feedback-label').className = 'feedback-label error';
    
    // 显示尝试次数
    document.getElementById('attempts-label').textContent = `尝试次数: ${currentQuestion.attempts}`;
    
    // 第二次尝试后显示提示
    if (currentQuestion.attempts >= 2) {
      const hint = correctAnswer.substring(0, Math.ceil(correctAnswer.length / 2));
      document.getElementById('hint-label').textContent = `提示: ${hint}...`;
    }
    
    // 第三次尝试后显示跳过按钮
    if (currentQuestion.attempts >= 3) {
      document.getElementById('skip-btn').style.display = 'inline-block';
    }
    
    // 添加动画效果
    answerInput.classList.add('shake');
    setTimeout(() => {
      answerInput.classList.remove('shake');
      answerInput.value = ''; // 清空输入
      answerInput.focus();
    }, 500);
  }
}

function endTest() {
  // 如果有跳过的题目，记为错误
  if (currentQuestion && currentQuestion.skipped) {
    skippedCount++;
    wrongWords.push(currentQuestion);
  }
  
  document.querySelector('.question-frame').classList.remove('test-active');
  document.getElementById('retry-btn').style.display = 'block';
  
  // 计算正确率
  const total = correctCount + wrongCount + skippedCount;
  const accuracy = Math.round((correctCount / total) * 100);
  
  // 显示结果
  const resultContent = document.getElementById('result-content');
  
  resultContent.innerHTML = `
    <div class="test-summary">
      <div class="stat-item">
        <div class="stat-value good">${correctCount}</div>
        <div class="stat-label">正确</div>
      </div>
      <div class="stat-item">
        <div class="stat-value ${wrongCount > 0 ? 'bad' : ''}">${wrongCount}</div>
        <div class="stat-label">错误</div>
      </div>
      <div class="stat-item">
        <div class="stat-value ${skippedCount > 0 ? 'bad' : ''}">${skippedCount}</div>
        <div class="stat-label">跳过</div>
      </div>
      <div class="stat-item">
        <div class="stat-value ${
          accuracy >= 80 ? 'good' : 
          accuracy >= 60 ? 'medium' : 'bad'
        }">${accuracy}%</div>
        <div class="stat-label">正确率</div>
      </div>
    </div>
  `;
  
  // 如果有错误，显示错误列表
  if (wrongWords.length > 0) {
    resultContent.innerHTML += `
      <h3>需要复习的单词:</h3>
      <ul class="wrong-words-list">
        ${wrongWords.map(w => `
          <li>
            <span class="chinese">${w.chinese}</span>
            <span class="english">${w.english}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
  
  // 重置当前问题
  currentQuestion = null;
  
  // 显示通知
  showNotification(`测试完成! 正确率: ${accuracy}%`, accuracy >= 80 ? 'success' : accuracy >= 60 ? 'warning' : 'error');
}

function bindEvents() {
  // 添加集合
  document.getElementById('add-section-btn').addEventListener('click', addSection);
  
  // 删除集合
  document.getElementById('delete-section-btn').addEventListener('click', deleteSection);
  
  // 添加单词
  document.getElementById('add-word-btn').addEventListener('click', addWord);
  
  // 删除单词
  document.getElementById('delete-word-btn').addEventListener('click', deleteWord);
  
  // 开始测试
  document.getElementById('start-test-btn').addEventListener('click', startTest);
  
  // 检查答案
  document.getElementById('check-btn').addEventListener('click', checkAnswer);
  
  // 回车检查
  document.getElementById('answer-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  });
  
  // 跳过
  document.getElementById('skip-btn').addEventListener('click', () => {
    currentQuestion.skipped = true;
    showNextQuestion();
  });
  
  // 结束测试
  document.getElementById('end-btn').addEventListener('click', endTest);
  
  // 重试
  document.getElementById('retry-btn').addEventListener('click', startTest);
  
  // 显示错误次数
  document.getElementById('show-mistakes-btn').addEventListener('click', showMistakes);
  
  // 重置错误次数
  document.getElementById('reset-mistakes-btn').addEventListener('click', resetMistakes);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  loadSections();
}); 