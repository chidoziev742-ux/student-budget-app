import { supabase } from './supabase-client.js';

const CATEGORIES = {
  food: { name: 'Food', icon: '🍴', tint: 'orange' },
  transport: { name: 'Transport', icon: '🚌', tint: 'blue' },
  data: { name: 'Data', icon: '📱', tint: 'purple' },
  school: { name: 'School', icon: '🎓', tint: 'green' },
  entertainment: { name: 'Entertainment', icon: '🎬', tint: 'pink' },
  shopping: { name: 'Shopping', icon: '🛍️', tint: 'yellow' },
  housing: { name: 'Housing', icon: '🏠', tint: 'red' },
  health: { name: 'Health', icon: '❤️', tint: 'rose' },
  other: { name: 'Other', icon: '•', tint: 'gray' }
};
const CATEGORY_ORDER = Object.keys(CATEGORIES);
const state = {
  user: null, profile: null, onboarding: null, page: 'dashboard',
  month: monthKey(), data: emptyMonth(), loading: false, authMode: 'signin',
  onboardingStep: 1, onboardingDraft: { income_source: '', income_amount: '', income_frequency: 'monthly', next_income_date: '', spending_categories: [] },
  categories: []
};

const $ = (id) => document.getElementById(id);
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = (n) => `₦${Number(n||0).toLocaleString('en-NG', {maximumFractionDigits: 0})}`;
const dateLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NG', {day:'numeric', month:'short'});
const fullDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NG', {day:'numeric', month:'short', year:'numeric'});
const monthName = (m) => new Date(`${m}-01T12:00:00`).toLocaleDateString('en-NG', {month:'long', year:'numeric'});
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthRange = (m) => { const [y,mo] = m.split('-').map(Number); const start=`${m}-01`; const end=new Date(Date.UTC(y,mo,1)).toISOString().slice(0,10); return {start,end}; };
const emptyMonth = () => ({budget:0, categoryBudgets:{}, income:[], expenses:[], savingsGoals:[]});
const cat = (key) => CATEGORIES[key] || CATEGORIES.other;

function toast(message, type='info') {
  const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=message; $('toast-region').appendChild(el);
  setTimeout(()=>el.remove(), 3500);
}
function setPage(page) {
  state.page=page;
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  $(`page-${page}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.page===page));
  renderPage(page);
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderPage(page) {
  const fn = {dashboard:renderDashboard,budget:renderBudget,add:renderAdd,history:renderHistory,goals:renderGoals,coach:renderCoach,settings:renderSettings,admin:renderAdmin}[page];
  if(fn) fn();
}
function initials(name='Student') { return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'S'; }
function displayName() { return state.profile?.full_name || state.user?.user_metadata?.full_name || state.user?.email?.split('@')[0] || 'Student'; }

function transactionIcon(t) { const c=cat(t.category); return `<span class="tx-icon ${c.tint}">${c.icon}</span>`; }
function transactionCard(t) {
  const isIncome=t.type==='income';
  return `<article class="transaction-card"><div class="tx-left">${transactionIcon(t)}<div><strong>${esc(cat(t.category).name || t.source || 'Income')}</strong><span>${esc(t.description || t.source || 'Transaction')} · ${dateLabel(t.date)}</span></div></div><strong class="amount ${isIncome?'positive':''}">${isIncome?'+':'−'}${money(t.amount).slice(1)}</strong></article>`;
}
function sectionTitle(icon,title,sub='',action='') { return `<div class="section-title"><div><span class="section-icon">${icon}</span><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div></div>${action}</div>`; }
function statCard(icon,label,value,accent='') { return `<div class="stat-card ${accent}"><span class="stat-icon">${icon}</span><span class="stat-label">${label}</span><strong>${value}</strong></div>`; }
function emptyState(icon,title,text,buttonText,action) { return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${text}</p>${buttonText?`<button class="btn btn-primary" data-action="${action}">${buttonText}</button>`:''}</div>`; }

async function getProfile(userId) {
  const {data,error}=await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();
  if(error && !['PGRST116'].includes(error.code)) console.warn('profile read:',error.message);
  return data || null;
}
async function getOnboarding(userId) {
  const {data,error}=await supabase.from('onboarding').select('*').eq('user_id',userId).maybeSingle();
  if(error && error.code!=='PGRST116') return {ok:false,error};
  return {ok:true,data:data||null};
}
async function ensureCategories(userId) {
  // The existing database uses a user-owned categories table. Create missing defaults safely.
  const {data,error}=await supabase.from('categories').select('id,name').eq('user_id',userId);
  if(error) { console.warn('categories read:',error.message); return []; }
  const existing=new Set((data||[]).map(x=>String(x.name).toLowerCase()));
  const missing=CATEGORY_ORDER.filter(k=>!existing.has(CATEGORIES[k].name.toLowerCase())).map(k=>({user_id:userId,name:CATEGORIES[k].name}));
  if(missing.length) {
    const {data:inserted,error:insertError}=await supabase.from('categories').insert(missing).select('id,name');
    if(!insertError) return [...(data||[]),...(inserted||[])];
  }
  return data||[];
}
async function getCategoryId(name) {
  const normalized=cat(name).name.toLowerCase();
  const found=state.categories.find(c=>String(c.name).toLowerCase()===normalized);
  return found?.id || null;
}

async function loadMonth() {
  if(!state.user) return;
  state.loading=true; renderPage(state.page);
  const {start,end}=monthRange(state.month); const uid=state.user.id;
  try {
    const [budgetQ,catBudgetQ,incomeQ,expenseQ,goalsQ] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id',uid).gte('month',start).lt('month',end).order('month',{ascending:false}).limit(1).maybeSingle(),
      supabase.from('category_budgets').select('*').eq('user_id',uid).eq('period',state.month),
      supabase.from('income').select('*').eq('user_id',uid).gte('received_date',start).lt('received_date',end).order('received_date',{ascending:false}),
      supabase.from('expenses').select('*').eq('user_id',uid).gte('expense_date',start).lt('expense_date',end).order('expense_date',{ascending:false}),
      supabase.from('savings_goals').select('*').eq('user_id',uid).order('created_at',{ascending:false})
    ]);
    const firstError=[budgetQ,catBudgetQ,incomeQ,expenseQ,goalsQ].find(q=>q.error);
    if(firstError) throw new Error(firstError.error.message);
    const categoryMap=Object.fromEntries(state.categories.map(c=>[c.id,c.name]));
    state.data={
      budget:Number(budgetQ.data?.amount||0),
      categoryBudgets:Object.fromEntries((catBudgetQ.data||[]).map(r=>[(categoryMap[r.category_id]||'Other').toLowerCase().replace(/\s+/g,'_'),Number(r.amount||0)])),
      income:(incomeQ.data||[]).map(r=>({id:r.id,amount:Number(r.amount||0),source:r.source||'Income',date:r.received_date||r.created_at,notes:r.notes||'',type:'income'})),
      expenses:(expenseQ.data||[]).map(r=>({id:r.id,amount:Number(r.amount||0),category:(categoryMap[r.category_id]||'Other').toLowerCase().replace(/\s+/g,'_'),description:r.description||r.notes||'Expense',date:r.expense_date||r.created_at,notes:r.notes||'',type:'expense',categoryId:r.category_id})),
      savingsGoals:goalsQ.data||[]
    };
  } catch(e) {
    console.error('loadMonth',e); state.data=emptyMonth(); toast(`Could not load your data: ${e.message}`,'error');
  } finally { state.loading=false; renderPage(state.page); }
}

function totals() {
  const income=state.data.income.reduce((s,x)=>s+Number(x.amount||0),0);
  const spent=state.data.expenses.reduce((s,x)=>s+Number(x.amount||0),0);
  const saved=Math.max(0,income-spent);
  const remaining=Math.max(0,state.data.budget-spent);
  const days=new Date(new Date(state.month+'-01T12:00:00').getFullYear(),new Date(state.month+'-01T12:00:00').getMonth()+1,0).getDate()-new Date().getDate();
  return {income,spent,saved,remaining,days:Math.max(0,days)};
}
function safeSpend() { const {remaining,days}=totals(); return days>0?Math.round(remaining/days):remaining; }

function renderDashboard() {
  const t=totals(); const recent=[...state.data.expenses.map(x=>({...x,type:'expense'})),...state.data.income.map(x=>({...x,type:'income'}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);
  const byCat={}; state.data.expenses.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+e.amount); const total=t.spent||1;
  const rows=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const goal=state.data.savingsGoals[0]; const goalPct=goal?Math.min(100,Math.round((Number(goal.saved_amount||0)/Math.max(1,Number(goal.target_amount||1)))*100)):0;
  $('page-dashboard').innerHTML=`
    <div class="page-head"><div><span class="eyebrow">${greeting()}, ${esc(displayName().split(' ')[0])} 👋</span><h1>Your money, in control.</h1><p>${monthName(state.month)} overview</p></div><button class="icon-button desktop-hide" data-page="settings">⚙</button></div>
    <div class="balance-card"><div><span>Available balance</span><strong>${money(t.remaining)}</strong><small>After this month's spending</small></div><span class="balance-eye">◉</span><div class="allowance-pill">Next safe spend · ${money(safeSpend())} today</div></div>
    <div class="stat-grid">${statCard('▣','Budget',money(state.data.budget),'orange-card')}${statCard('↘','Spent',money(t.spent),'neutral-card')}${statCard('♧','Saved',money(t.saved),'green-card')}</div>
    <div class="coach-strip"><span>🎯</span><div><strong>Safe to spend today</strong><p>${money(safeSpend())} · ${t.remaining>0?'You’re on track.':'Set a budget to get a daily guide.'}</p></div><span>✓</span></div>
    <div class="two-col">
      <section class="panel">${sectionTitle('◔','Where your money went','This month')}${rows.length?`<div class="donut-wrap"><div class="donut" style="--p1:${rows[0]?.[1]/total*100||0}%;--p2:${(rows[0]?.[1]+(rows[1]?.[1]||0))/total*100||0}%;"></div><div class="legend">${rows.map(([k,v])=>`<div><span class="legend-dot ${cat(k).tint}"></span><span>${esc(cat(k).name)}</span><strong>${Math.round(v/total*100)}%</strong></div>`).join('')}</div></div>`:emptyState('◔','No spending yet','Add your first expense to see your spending breakdown.','Add expense','go-add')}</section>
      <section class="panel">${sectionTitle('◎','Savings goal','Build something you want')}${goal?`<div class="goal-card"><div class="goal-head"><span class="goal-emoji">${esc(goal.icon||'🎯')}</span><div><strong>${esc(goal.name||'Savings goal')}</strong><span>${money(goal.saved_amount)} / ${money(goal.target_amount)}</span></div><b>${goalPct}%</b></div><div class="progress-track"><div class="progress-value green" style="width:${goalPct}%"></div></div><div class="goal-foot"><span>${money(Math.max(0,Number(goal.target_amount||0)-Number(goal.saved_amount||0)))} to go</span><span>${goal.target_date?`Target: ${fullDate(goal.target_date)}`:''}</span></div></div>`:emptyState('◎','Start a savings goal','Give your next goal a name and target.','Create goal','go-goals')}</section>
    </div>
    <section class="panel transactions-panel">${sectionTitle('▤','Recent transactions','Your latest money activity',`<button class="link-button" data-page="history">View all →</button>`)}${recent.length?recent.map(transactionCard).join(''):emptyState('▤','No transactions yet','Start tracking your money today.','Add transaction','go-add')}</section>
    <section class="money-coach-card"><div class="coach-icon">🌿</div><div><span class="eyebrow">Money Coach</span><h2>${coachHeadline()}</h2><p>${coachText()}</p></div><button class="btn btn-light" data-page="coach">See insights</button></section>`;
}
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening';}
function coachHeadline(){const t=totals(); if(!state.data.budget)return 'Set a budget and let your money breathe.'; if(t.spent>state.data.budget)return 'Your spending is above this month’s budget.'; if(t.budget>0 && t.spent/state.data.budget<.5)return 'You’re doing well. Keep your spending steady.'; return 'Small choices today make your goals easier tomorrow.';}
function coachText(){const t=totals(); if(!state.data.budget)return 'A simple monthly plan helps you know what is safe to spend.'; return `You have ${money(t.remaining)} left this month. Your safe daily amount is about ${money(safeSpend())}.`;}

function renderBudget(){
 const t=totals(); const keys=CATEGORY_ORDER; $('page-budget').innerHTML=`<div class="page-head"><div><span class="eyebrow">${monthName(state.month)}</span><h1>Budget</h1><p>Give every naira a job.</p></div><button class="month-select" id="budget-month">${monthName(state.month)}⌄</button></div>
 <section class="budget-hero"><div><span>Monthly budget</span><strong>${money(state.data.budget)}</strong><small>${money(t.remaining)} remaining · ${Math.round((t.spent/Math.max(1,state.data.budget))*100)}% used</small></div><div class="ring" style="--progress:${Math.min(100,t.spent/Math.max(1,state.data.budget)*100)}%"><b>${Math.round(t.spent/Math.max(1,state.data.budget)*100)}%</b></div></section>
 <section class="panel"><form id="budget-form" class="stack-form"><div class="field"><label>Total monthly budget</label><input id="budget-amount" type="number" min="0" step="100" value="${state.data.budget||''}" placeholder="50000" required></div><button class="btn btn-primary btn-full">Save budget</button></form></section>
 <section class="panel"><div class="section-title"><div><span class="section-icon">▦</span><div><h2>Category limits</h2><p>Optional monthly targets</p></div></div></div><div class="category-budget-list">${keys.map(k=>{const val=state.data.categoryBudgets[k]||0; const spent=state.data.expenses.filter(e=>e.category===k).reduce((s,e)=>s+e.amount,0);return `<div class="category-budget"><div class="cat-row"><span>${cat(k).icon}</span><div><strong>${cat(k).name}</strong><small>${money(spent)} spent</small></div><input data-cat-budget="${k}" type="number" min="0" value="${val||''}" placeholder="0"></div><div class="progress-track"><div class="progress-value ${cat(k).tint}" style="width:${Math.min(100, val?spent/val*100:0)}%"></div></div></div>`}).join('')}</div><button class="btn btn-secondary btn-full" id="save-category-budgets">Save category limits</button></section>`;
 $('budget-form').onsubmit=saveBudget; $('save-category-budgets').onclick=saveCategoryBudgets;
}
async function saveBudget(e){e.preventDefault(); const amount=Number($('budget-amount').value); if(amount<0)return toast('Enter a valid budget','error'); const {start}=monthRange(state.month); const payload={user_id:state.user.id,month:start,amount,updated_at:new Date().toISOString()}; const existing=await supabase.from('budgets').select('id').eq('user_id',state.user.id).gte('month',start).lt('month',monthRange(state.month).end).maybeSingle(); let q=existing.data?await supabase.from('budgets').update(payload).eq('id',existing.data.id):await supabase.from('budgets').insert({...payload,created_at:new Date().toISOString()}); if(q.error)return toast(q.error.message,'error'); await loadMonth(); toast('Budget saved','success');}
async function saveCategoryBudgets(){const rows=[]; document.querySelectorAll('[data-cat-budget]').forEach(input=>{const amount=Number(input.value||0); const id=state.categories.find(c=>c.name.toLowerCase()===cat(input.dataset.catBudget).name.toLowerCase())?.id; if(id&&amount>0) rows.push({user_id:state.user.id,category_id:id,period:state.month,amount,updated_at:new Date().toISOString()});}); if(!rows.length)return toast('Add at least one category limit','info'); const q=await supabase.from('category_budgets').upsert(rows,{onConflict:'user_id,category_id,period'}); if(q.error)return toast(q.error.message,'error'); await loadMonth(); toast('Category limits saved','success');}

function renderAdd(){ $('page-add').innerHTML=`<div class="page-head"><div><span class="eyebrow">Track it now</span><h1>Add transaction</h1><p>Keep your money history accurate.</p></div></div><div class="segmented" id="tx-type"><button class="active" data-type="expense">Expense</button><button data-type="income">Income</button><button data-type="transfer">Transfer</button></div><section class="panel"><form id="transaction-form" class="stack-form"><div class="amount-input"><span>₦</span><input id="tx-amount" type="number" min="1" step="1" placeholder="0" required></div><div class="field" id="category-field"><label>Category</label><div class="category-grid">${CATEGORY_ORDER.map(k=>`<button type="button" class="category-option" data-category="${k}"><span>${cat(k).icon}</span>${cat(k).name}</button>`).join('')}</div><input type="hidden" id="tx-category" value="food"></div><div class="field"><label id="desc-label">What did you spend on?</label><input id="tx-description" placeholder="Lunch, bus fare, data..." required></div><div class="field"><label>Date</label><input id="tx-date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field hidden" id="source-field"><label>Income source</label><input id="tx-source" placeholder="Allowance, salary, freelance..." /></div><div class="field"><label>Note <span>(optional)</span></label><textarea id="tx-notes" rows="3" placeholder="Add a note"></textarea></div><button class="btn btn-primary btn-full">Save transaction</button></form></section>`; bindAdd();}
function bindAdd(){let type='expense';document.querySelectorAll('#tx-type button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tx-type button').forEach(x=>x.classList.remove('active'));b.classList.add('active');type=b.dataset.type;$('category-field').classList.toggle('hidden',type!=='expense');$('source-field').classList.toggle('hidden',type!=='income');$('desc-label').textContent=type==='income'?'Description':'What did you spend on?';});document.querySelectorAll('.category-option').forEach(b=>b.onclick=()=>{document.querySelectorAll('.category-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('tx-category').value=b.dataset.category;});document.querySelector('.category-option').classList.add('selected');$('transaction-form').onsubmit=async e=>{e.preventDefault();const amount=Number($('tx-amount').value);if(amount<=0)return toast('Enter an amount greater than zero','error');const date=$('tx-date').value;let q;if(type==='expense'){const cid=await getCategoryId($('tx-category').value);if(!cid)return toast('Your categories are not ready yet. Refresh and try again.','error');q=await supabase.from('expenses').insert({user_id:state.user.id,category_id:cid,description:$('tx-description').value.trim(),amount,expense_date:date,notes:$('tx-notes').value.trim(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()});}else if(type==='income'){q=await supabase.from('income').insert({user_id:state.user.id,source:$('tx-source').value.trim()||$('tx-description').value.trim(),amount,received_date:date,notes:$('tx-notes').value.trim(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()});}else{return toast('Transfers will be enabled after the core transaction tables are confirmed.','info');}if(q.error)return toast(q.error.message,'error');toast(type==='expense'?'Expense added':'Income added','success');await loadMonth();setPage('dashboard');};}

function renderHistory(){const all=[...state.data.expenses,...state.data.income].sort((a,b)=>new Date(b.date)-new Date(a.date));$('page-history').innerHTML=`<div class="page-head"><div><span class="eyebrow">${monthName(state.month)}</span><h1>Transactions</h1><p>${money(totals().spent)} spent this month</p></div><button class="icon-button" id="history-filter">⌁</button></div><div class="filter-pills"><button class="active">All</button>${['food','transport','data','school','other'].map(k=>`<button data-filter="${k}">${cat(k).name}</button>`).join('')}</div><section class="transaction-list">${all.length?all.map(transactionCard).join(''):emptyState('▤','Nothing here yet','Your transactions will appear here.','Add transaction','go-add')}</section>`;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter-pills button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const k=b.dataset.filter;document.querySelector('.transaction-list').innerHTML=all.filter(x=>x.type==='income'||x.category===k).map(transactionCard).join('')||emptyState('⌁','No matching transactions','Try another category.','','');});}

function renderGoals(){const goals=state.data.savingsGoals;$('page-goals').innerHTML=`<div class="page-head"><div><span class="eyebrow">Build your future</span><h1>Savings goals</h1><p>Small deposits become big wins.</p></div><button class="icon-button" id="new-goal">＋</button></div><div class="segmented"><button class="active">Active</button><button>Completed</button></div><section class="goal-list">${goals.length?goals.map(g=>{const pct=Math.min(100,Math.round(Number(g.saved_amount||0)/Math.max(1,Number(g.target_amount||1))*100));return `<article class="goal-large"><div class="goal-large-top"><span class="goal-big-icon">${esc(g.icon||'🎯')}</span><div><h2>${esc(g.name||'Savings goal')}</h2><p>${money(g.saved_amount)} / ${money(g.target_amount)}</p></div><b>${pct}%</b></div><div class="progress-track"><div class="progress-value green" style="width:${pct}%"></div></div><div class="goal-foot"><span>${money(Math.max(0,g.target_amount-g.saved_amount))} to go</span><span>${g.target_date?`Target: ${fullDate(g.target_date)}`:''}</span></div></article>`}).join(''):emptyState('🏆','No savings goals yet','Create a goal for something you really want.','Create your first goal','new-goal')} </section><div class="encourage">🏆 <strong>You’re saving well.</strong><span>Keep your goals within reach.</span></div>`;if($('new-goal'))$('new-goal').onclick=()=>openGoalModal();}
async function openGoalModal(){openModal(`<div class="modal-head"><div><span class="eyebrow">New goal</span><h2>Create a savings goal</h2></div><button class="icon-button" data-close-modal>×</button></div><form id="goal-form" class="stack-form"><div class="field"><label>Goal name</label><input id="goal-name" placeholder="Laptop, AirPods, Trip to Lagos" required></div><div class="field"><label>Target amount</label><input id="goal-target" type="number" min="1" required></div><div class="field"><label>How much have you saved?</label><input id="goal-saved" type="number" min="0" value="0"></div><div class="field"><label>Target date</label><input id="goal-date" type="date"></div><button class="btn btn-primary btn-full">Create goal</button></form>`);$('goal-form').onsubmit=async e=>{e.preventDefault();const q=await supabase.from('savings_goals').insert({user_id:state.user.id,name:$('goal-name').value.trim(),target_amount:Number($('goal-target').value),saved_amount:Number($('goal-saved').value||0),target_date:$('goal-date').value||null,icon:'🎯',description:'',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});if(q.error)return toast(q.error.message,'error');closeModal();await loadMonth();toast('Savings goal created','success');};}

function renderCoach(){const t=totals();const cats=Object.entries(state.data.expenses.reduce((a,e)=>(a[e.category]=(a[e.category]||0)+e.amount,a),{})).sort((a,b)=>b[1]-a[1]);const top=cats[0];$('page-coach').innerHTML=`<div class="page-head"><div><span class="eyebrow">Your personal guide</span><h1>Money Coach</h1><p>Simple insights from your spending.</p></div><span class="coach-crown">♛</span></div><section class="coach-feature"><span class="coach-leaf">🌿</span><h2>${top?`You spent ${money(top[1])} on ${cat(top[0]).name.toLowerCase()} this month.`:'Start tracking to unlock your first insight.'}</h2><p>${top?`That is ${Math.round(top[1]/Math.max(1,t.spent)*100)}% of your spending. Try setting a category limit in Budget if it feels high.`:'Once you add a few transactions, your Money Coach will highlight patterns and practical next steps.'}</p></section><section class="panel">${sectionTitle('⌁','Spending trend','Monthly overview')}<div class="bar-chart">${[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-i*4);const ds=d.toISOString().slice(0,10);const val=state.data.expenses.filter(e=>e.date===ds).reduce((s,e)=>s+e.amount,0);const h=Math.min(100,(val/Math.max(1,t.spent))*100*3);return `<div><span style="height:${Math.max(8,h)}%"></span><small>${d.toLocaleDateString('en-NG',{day:'numeric'})}</small></div>`}).reverse().join('')}</div></section><div class="insight-grid"><div class="insight-card">🔥<strong>${t.spent>state.data.budget&&state.data.budget?'Over budget':'On track'}</strong><span>${state.data.budget?`${Math.round(t.spent/state.data.budget*100)}% of budget used`:'Set a budget to measure this'}</span></div><div class="insight-card">🏆<strong>${t.saved?money(t.saved):'₦0'} saved</strong><span>This month so far</span></div></div>`;}

function renderSettings(){const name=displayName();$('page-settings').innerHTML=`<div class="page-head"><div><span class="eyebrow">Your account</span><h1>Settings</h1><p>Make Student Budget feel like yours.</p></div></div><section class="profile-card"><div class="avatar big">${initials(name)}</div><div><h2>${esc(name)}</h2><p>${esc(state.user?.email||'')}</p></div><button class="icon-button">›</button></section><section class="settings-list"><button data-setting="profile"><span>👤</span><div><strong>Profile</strong><small>Name and account details</small></div><b>›</b></button><button data-setting="currency"><span>₦</span><div><strong>Currency</strong><small>Naira (₦)</small></div><b>›</b></button><button data-setting="appearance"><span>◐</span><div><strong>Appearance</strong><small>System</small></div><b>›</b></button><button data-setting="notifications"><span>♧</span><div><strong>Notifications</strong><small>Budget reminders and insights</small></div><label class="switch"><input id="notif-toggle" type="checkbox" checked><span></span></label></button><button data-setting="export"><span>⇩</span><div><strong>Export data</strong><small>Download a copy of your transactions</small></div><b>›</b></button><button data-setting="admin" id="admin-setting" class="${state.profile?.role==='admin'?'':'hidden'}"><span>⚙</span><div><strong>Admin</strong><small>Product monitoring</small></div><b>›</b></button><button data-setting="about"><span>ⓘ</span><div><strong>About</strong><small>Student Budget Tracker V2</small></div><b>›</b></button></section><button id="logout" class="btn btn-danger btn-full">↪ Log out</button><p class="version">Version 2.0 · Made for students</p>`;document.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>{if(b.dataset.setting==='export')exportData();else if(b.dataset.setting==='admin')setPage('admin');else toast(`${b.querySelector('strong')?.textContent||'Setting'} is ready for the next update.`,'info')});$('logout').onclick=logout;}
function exportData(){const data={exportedAt:new Date().toISOString(),month:state.month,budget:state.data.budget,income:state.data.income,expenses:state.data.expenses,savingsGoals:state.data.savingsGoals};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`student-budget-${state.month}.json`;a.click();URL.revokeObjectURL(a.href);toast('Your data export is ready','success');}

function renderAdmin(){if(state.profile?.role!=='admin'){setPage('dashboard');return;}$('page-admin').innerHTML=`<div class="page-head"><div><span class="eyebrow">Admin</span><h1>Product overview</h1><p>Monitor the student experience.</p></div></div><div class="stat-grid">${statCard('👥','Your role','Admin','green-card')}${statCard('▣','Current users','Protected','orange-card')}${statCard('♧','Data system','Supabase','neutral-card')}</div><section class="panel"><h2>Admin area</h2><p class="muted">This V2 keeps the Admin area separate from the student experience. Add product metrics, support views, notification status and reported issues here without exposing admin controls to normal students.</p></section>`;}

function renderOnboarding(){const d=state.onboardingDraft;const content=$('onboarding-content');if(state.onboardingStep===1)content.innerHTML=`<div class="onboarding-copy"><span class="eyebrow">Welcome</span><h1>Let’s set up your money plan.</h1><p>A few quick questions help us make your dashboard useful from day one.</p></div><div class="stack-form"><div class="field"><label>Where does your money come from?</label><select id="ob-source"><option value="">Choose one</option><option>Allowance</option><option>Salary</option><option>Business</option><option>Freelance</option><option>Other</option></select></div><div class="field"><label>How much do you usually receive?</label><input id="ob-amount" type="number" min="0" placeholder="50000"></div><div class="field"><label>How often?</label><select id="ob-frequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="irregular">Irregular</option></select></div><button class="btn btn-primary btn-full" data-ob-next="2">Continue</button></div>`;else if(state.onboardingStep===2)content.innerHTML=`<div class="onboarding-copy"><span class="eyebrow">Your habits</span><h1>Where does your money usually go?</h1><p>Pick the categories you want to keep an eye on.</p></div><div class="category-grid ob-cats">${CATEGORY_ORDER.map(k=>`<button class="category-option ${d.spending_categories.includes(k)?'selected':''}" data-ob-cat="${k}">${cat(k).icon} ${cat(k).name}</button>`).join('')}</div><button class="btn btn-primary btn-full" data-ob-next="3">Continue</button>`;else content.innerHTML=`<div class="onboarding-copy"><span class="eyebrow">Almost there</span><h1>Your money, your rules.</h1><p>We’ll use your answers to set up a calm starting point. You can change everything later.</p></div><div class="onboarding-summary"><div><span>Income</span><strong>${esc(d.income_source||'Not set')} · ${d.income_amount?money(d.income_amount):'Amount not set'}</strong></div><div><span>Frequency</span><strong>${esc(d.income_frequency)}</strong></div><div><span>Categories</span><strong>${d.spending_categories.length?d.spending_categories.map(k=>cat(k).name).join(', '):'None selected'}</strong></div></div><button class="btn btn-primary btn-full" data-ob-finish>Start using Student Budget</button>`;}

function openModal(html){$('modal-card').innerHTML=html;$('modal').classList.remove('hidden');$('modal-card').querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);}
function closeModal(){$('modal').classList.add('hidden');$('modal-card').innerHTML='';}
async function saveOnboarding(){const d=state.onboardingDraft;const payload={user_id:state.user.id,completed:true,income_source:d.income_source||null,income_amount:d.income_amount?Number(d.income_amount):null,income_frequency:d.income_frequency||null,next_income_date:d.next_income_date||null,spending_categories:d.spending_categories||[],safe_daily_spending:null,updated_at:new Date().toISOString()};const q=await supabase.from('onboarding').upsert({...payload,created_at:state.onboarding?.created_at||new Date().toISOString()},{onConflict:'user_id'}).select().maybeSingle();if(q.error)return toast(q.error.message,'error');await supabase.from('profiles').upsert({id:state.user.id,full_name:state.user.user_metadata?.full_name||displayName(),email:state.user.email,updated_at:new Date().toISOString()},{onConflict:'id'});if(d.income_amount&&Number(d.income_amount)>0){await supabase.from('income').insert({user_id:state.user.id,source:d.income_source||'Income',amount:Number(d.income_amount),received_date:new Date().toISOString().slice(0,10),notes:'Initial income from onboarding',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});}state.onboarding={...payload};await enterApp();}

async function enterApp(){ $('auth-shell').classList.add('hidden');$('onboarding-shell').classList.add('hidden');$('app-shell').classList.remove('hidden');$('profile-name').textContent=displayName().split(' ')[0];$('profile-avatar').textContent=initials(displayName());$('month-chip').textContent=monthName(state.month);state.categories=await ensureCategories(state.user.id);await loadMonth();setPage('dashboard'); }
async function routeAuth(user, event='INITIAL_SESSION'){
  if(!user){state.user=null;$('app-shell').classList.add('hidden');$('onboarding-shell').classList.add('hidden');$('auth-shell').classList.remove('hidden');return;}
  state.user=user;state.profile=await getProfile(user.id);const ob=await getOnboarding(user.id);
  // Critical rule: a token refresh never reroutes an already authenticated user.
  if(event==='TOKEN_REFRESHED' && !$('app-shell').classList.contains('hidden')) return;
  if(!ob.ok){console.warn('Onboarding check failed; preserving authenticated app state.');if(!$('app-shell').classList.contains('hidden'))return;toast('Could not verify onboarding. Please try again.','error');return;}
  state.onboarding=ob.data;
  if(!ob.data?.completed){$('auth-shell').classList.add('hidden');$('app-shell').classList.add('hidden');$('onboarding-shell').classList.remove('hidden');state.onboardingStep=1;renderOnboarding();return;}
  await enterApp();
}

async function logout(){await supabase.auth.signOut();state.user=null;state.profile=null;state.onboarding=null;$('app-shell').classList.add('hidden');$('onboarding-shell').classList.add('hidden');$('auth-shell').classList.remove('hidden');toast('Signed out','success');}

function bindGlobal(){
 $('bottom-nav').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)setPage(b.dataset.page);});
 document.addEventListener('click',e=>{const p=e.target.closest('[data-page]');if(p&&!p.closest('#bottom-nav'))setPage(p.dataset.page);const a=e.target.closest('[data-action]');if(a){if(a.dataset.action==='go-add')setPage('add');if(a.dataset.action==='go-goals')setPage('goals');if(a.dataset.action==='new-goal')openGoalModal();}if(e.target.matches('[data-close-modal]'))closeModal();});
 $('profile-chip').onclick=()=>setPage('settings'); $('month-chip').onclick=()=>toast('Month switching is available from Budget and History in this first V2 build.','info');
 $('auth-toggle').onclick=()=>{state.authMode=state.authMode==='signin'?'signup':'signin';$('signup-name-wrap').classList.toggle('hidden',state.authMode!=='signup');$('auth-submit').textContent=state.authMode==='signup'?'Create account':'Sign in';$('auth-toggle').textContent=state.authMode==='signup'?'I already have an account':'Create an account';$('auth-password').autocomplete=state.authMode==='signup'?'new-password':'current-password';};
 $('auth-form').onsubmit=async e=>{e.preventDefault();const email=$('auth-email').value.trim();const password=$('auth-password').value;if(state.authMode==='signup'){const name=$('auth-name').value.trim();const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)return showAuthError(error.message);toast('Account created. Check your email if confirmation is enabled.','success');}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)return showAuthError(error.message);}};
 $('modal').addEventListener('click',e=>{if(e.target.matches('.modal-backdrop'))closeModal();});
 document.addEventListener('click',e=>{const n=e.target.closest('[data-ob-next]');if(n){if(state.onboardingStep===1){state.onboardingDraft.income_source=$('ob-source').value;state.onboardingDraft.income_amount=$('ob-amount').value;state.onboardingDraft.income_frequency=$('ob-frequency').value;}state.onboardingStep=Number(n.dataset.obNext);renderOnboarding();}const c=e.target.closest('[data-ob-cat]');if(c){const k=c.dataset.obCat;const arr=state.onboardingDraft.spending_categories;state.onboardingDraft.spending_categories=arr.includes(k)?arr.filter(x=>x!==k):[...arr,k];renderOnboarding();}if(e.target.closest('[data-ob-finish]'))saveOnboarding();});
}
function showAuthError(msg){$('auth-message').textContent=msg;$('auth-message').className='inline-message error';}

bindGlobal();renderOnboarding();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

supabase.auth.onAuthStateChange((event,session)=>{
  // Do not await Supabase calls inside the auth callback. Schedule them after the callback.
  setTimeout(()=>routeAuth(session?.user||null,event),0);
});
