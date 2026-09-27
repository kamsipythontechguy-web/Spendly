/* =========================================================
   SPENDLY — COMPLETE APP.JS
========================================================= */
"use strict";

const STORAGE_KEY = "spendly_app_v2";

const CATEGORIES = {
  expense: [
    ["Food","🍔"],["Transport","🚗"],["Shopping","🛍️"],["Bills","💡"],["Entertainment","🎬"],
    ["Health","❤️"],["Education","📚"],["Rent","🏠"],["Subscriptions","📱"],["Other","📦"]
  ],
  income: [["Salary","💼"],["Freelance","💻"],["Business","🏪"],["Gift","🎁"],["Allowance","💰"],["Other","💵"]]
};

const defaultState = {
  userName:"CBN", currency:"NGN", currencySymbol:"₦", theme:"dark",
  monthlyBudget:0, transactions:[], categoryBudgets:[], savingsGoals:[],
  recurringTransactions:[], currentFilter:"all", currentPeriod:"week"
};

let state = loadState();
let transactionType = "expense";
let recurringType = "expense";
let editingRecurringId = null;
let goalMoneyId = null;
let goalMoneyMode = "add";
let confirmCallback = null;

function $(s){return document.querySelector(s)}
function $$(s){return [...document.querySelectorAll(s)]}
function uid(prefix="id"){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {...defaultState,...(saved||{}),transactions:Array.isArray(saved?.transactions)?saved.transactions:[],categoryBudgets:Array.isArray(saved?.categoryBudgets)?saved.categoryBudgets:[],savingsGoals:Array.isArray(saved?.savingsGoals)?saved.savingsGoals:[],recurringTransactions:Array.isArray(saved?.recurringTransactions)?saved.recurringTransactions:[]};
  }catch{return {...defaultState}}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function money(n){return `${state.currencySymbol}${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function formatDate(date){return new Date(date+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}
function todayISO(){return new Date().toISOString().slice(0,10)}
function monthKey(d){return String(d).slice(0,7)}
function currentMonth(){return monthKey(todayISO())}
function monthTransactions(){return state.transactions.filter(t=>monthKey(t.date)===currentMonth())}
function iconFor(category){for(const group of Object.values(CATEGORIES)){const hit=group.find(x=>x[0]===category);if(hit)return hit[1]}return "📦"}
function toast(msg,icon="✓"){const el=$("#toast");$("#toastMessage").textContent=msg;$("#toastIcon").textContent=icon;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2300)}
function openModal(id){$(id).classList.add("open")}
function closeModal(id){$(id).classList.remove("open")}

function applyTheme(){
  document.body.classList.toggle("light",state.theme==="light");
  $("#themeIcon").textContent=state.theme==="light"?"☾":"☼";
  $("#appearanceText").textContent=state.theme==="light"?"Light mode":"Dark mode";
}
function toggleTheme(){state.theme=state.theme==="dark"?"light":"dark";saveState();applyTheme()}

function setCurrency(code,symbol){
  state.currency=code;state.currencySymbol=symbol;saveState();
  updateCurrencyUI();refreshApp();closeModal("#currencyModal");toast("Currency updated");
}
function updateCurrencyUI(){
  $("#selectedCurrency").textContent=`${state.currency} — ${state.currencySymbol}`;
  ["#amountCurrency","#budgetCurrency","#categoryBudgetCurrency","#goalTargetCurrency","#goalInitialCurrency","#goalMoneyCurrency","#recurringCurrency"].forEach(s=>{const el=$(s);if(el)el.textContent=state.currencySymbol});
}

function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
}
function populateSelect(id,items){
  const el=$(id); if(!el)return;
  el.innerHTML=items.map(([name])=>`<option value="${esc(name)}">${esc(name)}</option>`).join("");
}
function populateTransactionCategories(){
  populateSelect("#categoryInput",CATEGORIES[transactionType]);
  populateSelect("#recurringCategoryInput",CATEGORIES[recurringType]);
}
function setDefaultDates(){
  $("#dateInput").value=todayISO();
  $("#recurringDateInput").value=todayISO();
}

function renderTransactions(){
  const all=state.transactions.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)||Number(b.createdAt)-Number(a.createdAt));
  const q=($("#transactionSearch")?.value||"").trim().toLowerCase();
  const filter=state.currentFilter;
  const filtered=all.filter(t=>(filter==="all"||t.type===filter)&&(!q||`${t.category} ${t.note||""}`.toLowerCase().includes(q)));
  const recent=all.slice(0,5);
  renderTransactionList("#recentTransactions",recent,true);
  renderTransactionList("#allTransactions",filtered,false);
}
function renderTransactionList(selector,items,compact){
  const el=$(selector);if(!el)return;
  if(!items.length){el.innerHTML=`<div class="empty-state ${compact?"compact":""}"><strong>${compact?"No transactions yet":"No matching transactions"}</strong><span>${compact?"Add your first income or expense to start tracking.":"Try another search or filter."}</span></div>`;return}
  el.innerHTML=items.map(t=>{
    const sign=t.type==="income"?"+":"−";
    const recurring=t.recurringId?" • Recurring":"";
    return `<div class="transaction-item">
      <div class="transaction-icon">${iconFor(t.category)}</div>
      <div class="transaction-details"><strong>${esc(t.note||t.category)}</strong><small>${esc(t.category)} • ${esc(formatDate(t.date))}${recurring}</small></div>
      <div class="transaction-amount ${t.type}">${sign}${money(t.amount)}</div>
      ${compact?"":`<button class="transaction-delete" data-delete-transaction="${t.id}" aria-label="Delete">×</button>`}
    </div>`;
  }).join("");
}

function updateDashboard(){
  const income=state.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
  const expense=state.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  const balance=income-expense;
  $("#totalIncome").textContent=money(income);$("#totalExpense").textContent=money(expense);$("#totalBalance").textContent=money(balance);
  const m=monthTransactions(),spent=m.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  const pct=state.monthlyBudget>0?Math.min(100,spent/state.monthlyBudget*100):0;
  $("#monthlySpent").textContent=money(spent);$("#homeBudget").textContent=money(state.monthlyBudget);
  $("#budgetProgress").style.width=`${pct}%`;$("#spendingPercent").textContent=`${Math.round(pct)}%`;
  $("#budgetMessage").textContent=state.monthlyBudget?spent>state.monthlyBudget?"You've gone over your budget.":`${money(Math.max(0,state.monthlyBudget-spent))} remaining this month.`:"Set a monthly budget to start tracking.";
  const now=new Date();$("#currentMonth").textContent=now.toLocaleDateString(undefined,{month:"long",year:"numeric"});$("#budgetMonthTitle").textContent=$("#currentMonth").textContent;
  $("#userGreeting").textContent=`Hi, ${state.userName||"there"} 👋`;
  $("#profileName").textContent=state.userName||"CBN";$("#profileAvatar").textContent=(state.userName||"C").trim().charAt(0).toUpperCase();
}

function saveTransaction(){
  const amount=Number($("#amountInput").value);
  if(!amount||amount<=0)return toast("Enter a valid amount","!");
  const date=$("#dateInput").value||todayISO();
  state.transactions.push({id:uid("tx"),type:transactionType,amount,category:$("#categoryInput").value,date,note:$("#noteInput").value.trim(),createdAt:Date.now()});
  saveState();closeModal("#transactionModal");$("#amountInput").value="";$("#noteInput").value="";refreshApp();toast("Transaction saved");
}
function openTransaction(type){
  transactionType=type;$("#transactionModalTitle").textContent=type==="income"?"Add Income":"Add Expense";
  $$(".type-button[data-transaction-type]").forEach(b=>b.classList.toggle("active",b.dataset.transactionType===type));
  populateTransactionCategories();setDefaultDates();openModal("#transactionModal");setTimeout(()=>$("#amountInput").focus(),120);
}

function updateBudgetPage(){
  const spent=monthTransactions().filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  const pct=state.monthlyBudget?Math.min(100,spent/state.monthlyBudget*100):0;
  $("#budgetSpent").textContent=money(spent);$("#monthlyBudgetAmount").textContent=money(state.monthlyBudget);
  $("#mainBudgetProgress").style.width=`${pct}%`;$("#budgetPercent").textContent=`${Math.round(pct)}%`;
  $("#budgetLeft").textContent=state.monthlyBudget?`${money(Math.max(0,state.monthlyBudget-spent))} left`: "No budget set";
  const el=$("#categoryBudgets");
  if(!state.categoryBudgets.length){el.innerHTML=`<div class="empty-state compact"><strong>No category budgets</strong><span>Set limits for Food, Transport, Bills and more.</span></div>`;return}
  el.innerHTML=state.categoryBudgets.map(b=>{
    const spentCat=monthTransactions().filter(t=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+Number(t.amount),0);
    const pct=b.amount?Math.min(100,spentCat/b.amount*100):0;
    return `<div class="budget-item"><div class="budget-item-top"><span class="budget-item-icon">${iconFor(b.category)}</span><span class="budget-item-name">${esc(b.category)}</span><span class="budget-item-amount">${money(spentCat)} / ${money(b.amount)}</span><button class="transaction-delete" data-delete-budget="${b.id}">×</button></div><div class="budget-mini-progress"><i style="width:${pct}%"></i></div></div>`;
  }).join("");
}
function openBudgetModal(){ $("#budgetInput").value=state.monthlyBudget||"";openModal("#budgetModal");setTimeout(()=>$("#budgetInput").focus(),100)}
function saveBudget(){const amount=Number($("#budgetInput").value)||0;state.monthlyBudget=amount;saveState();closeModal("#budgetModal");refreshApp();toast("Budget updated")}
function openCategoryBudgetModal(){
  populateSelect("#categoryBudgetCategory",CATEGORIES.expense);
  $("#categoryBudgetInput").value="";
  openModal("#categoryBudgetModal");
}
function saveCategoryBudget(){
  const category=$("#categoryBudgetCategory").value,amount=Number($("#categoryBudgetInput").value);
  if(!amount||amount<=0)return toast("Enter a valid limit","!");
  const existing=state.categoryBudgets.find(b=>b.category===category);
  if(existing)existing.amount=amount;else state.categoryBudgets.push({id:uid("bud"),category,amount});
  saveState();closeModal("#categoryBudgetModal");refreshApp();toast("Category budget saved");
}

function renderGoals(){
  const el=$("#goalsList"),goals=state.savingsGoals;
  const total=goals.reduce((s,g)=>s+Number(g.current),0);$("#totalGoalSaved").textContent=money(total);
  if(!goals.length){el.innerHTML=`<div class="empty-state"><strong>Create your first savings goal</strong><span>Set a target and watch your progress grow.</span></div>`;return}
  el.innerHTML=goals.map(g=>{
    const pct=g.target?Math.min(100,Number(g.current)/Number(g.target)*100):0;
    const done=Number(g.current)>=Number(g.target);
    const left=Math.max(0,Number(g.target)-Number(g.current));
    return `<div class="goal-card ${done?"completed":""}">
      <div class="goal-card-head"><div class="goal-emoji">${g.emoji||"🎯"}</div><div class="goal-title"><strong>${esc(g.name)}</strong><small>${done?"Goal reached 🎉":`${money(left)} remaining`}</small></div>${done?'<span class="goal-check">COMPLETED</span>':""}</div>
      <div class="goal-values"><div><strong>${money(g.current)}</strong><span> saved</span></div><div><span>Target </span><strong>${money(g.target)}</strong></div></div>
      <div class="goal-progress"><i style="width:${pct}%"></i></div><div class="goal-meta"><span>${Math.round(pct)}% complete</span><span>${money(left)} to go</span></div>
      <div class="goal-actions"><button class="mini-button add" data-goal-money="${g.id}" data-goal-mode="add">＋ Add money</button><button class="mini-button withdraw" data-goal-money="${g.id}" data-goal-mode="withdraw">− Withdraw</button><button class="mini-button delete" data-delete-goal="${g.id}">×</button></div>
    </div>`;
  }).join("");
}
function openGoalModal(){ $("#goalNameInput").value="";$("#goalTargetInput").value="";$("#goalInitialInput").value="";updateCurrencyUI();openModal("#goalModal");setTimeout(()=>$("#goalNameInput").focus(),100)}
function saveGoal(){
  const name=$("#goalNameInput").value.trim(),target=Number($("#goalTargetInput").value),initial=Number($("#goalInitialInput").value)||0;
  if(!name)return toast("Enter a goal name","!");
  if(!target||target<=0)return toast("Enter a valid target","!");
  if(initial>target)return toast("Saved amount cannot exceed target","!");
  state.savingsGoals.push({id:uid("goal"),name,target,current:initial,emoji:"🎯",createdAt:Date.now()});
  saveState();closeModal("#goalModal");refreshApp();toast("Savings goal created","🎯");
}
function openGoalMoney(id,mode){
  const g=state.savingsGoals.find(x=>x.id===id);if(!g)return;
  goalMoneyId=id;goalMoneyMode=mode;
  $("#goalMoneyTitle").textContent=mode==="add"?"Add money":"Withdraw money";
  $("#goalMoneyLabel").textContent=mode==="add"?"Amount to add":"Amount to withdraw";
  $("#goalMoneyBalance").textContent=`${money(g.current)} saved • Target ${money(g.target)}`;
  $("#goalMoneyInput").value="";openModal("#goalMoneyModal");setTimeout(()=>$("#goalMoneyInput").focus(),100);
}
function saveGoalMoney(){
  const g=state.savingsGoals.find(x=>x.id===goalMoneyId),amount=Number($("#goalMoneyInput").value);
  if(!g||!amount||amount<=0)return toast("Enter a valid amount","!");
  if(goalMoneyMode==="add"&&g.current+amount>g.target)return toast(`Only ${money(g.target-g.current)} is needed`,"!");
  if(goalMoneyMode==="withdraw"&&amount>g.current)return toast("You cannot withdraw more than saved","!");
  g.current=goalMoneyMode==="add"?g.current+amount:g.current-amount;
  saveState();closeModal("#goalMoneyModal");refreshApp();toast(goalMoneyMode==="add"?"Money added to goal":"Money withdrawn");
}

function renderRecurring(){
  const el=$("#recurringList");if(!state.recurringTransactions.length){el.innerHTML=`<div class="empty-state compact"><strong>No recurring transactions</strong><span>Automate salary, rent, subscriptions and regular bills.</span></div>`;return}
  el.innerHTML=state.recurringTransactions.map(r=>{
    const status=r.active!==false?"Active":"Paused";
    return `<div class="recurring-card"><div class="recurring-top"><div class="recurring-icon">${iconFor(r.category)}</div><div class="recurring-main"><strong>${esc(r.note||r.category)}</strong><small>${esc(r.category)} • ${r.frequency} • next ${formatDate(r.nextDate)}</small></div><div class="recurring-amount ${r.type==="income"?"income-text":"expense-text"}">${r.type==="income"?"+":"−"}${money(r.amount)}</div></div><div class="recurring-actions"><button class="mini-button green" data-toggle-recurring="${r.id}">${status==="Active"?"Pause":"Resume"}</button><button class="mini-button" data-edit-recurring="${r.id}">Edit</button><button class="mini-button red" data-delete-recurring="${r.id}">Delete</button></div></div>`;
  }).join("");
}
function addFrequency(date,frequency){
  const d=new Date(date+"T00:00:00");
  if(frequency==="daily")d.setDate(d.getDate()+1);
  if(frequency==="weekly")d.setDate(d.getDate()+7);
  if(frequency==="monthly")d.setMonth(d.getMonth()+1);
  if(frequency==="yearly")d.setFullYear(d.getFullYear()+1);
  return d.toISOString().slice(0,10);
}
function processRecurring(){
  let changed=false;const today=todayISO();
  state.recurringTransactions.forEach(r=>{
    if(r.active===false)return;
    let guard=0;
    while(r.nextDate<=today&&guard<500){
      const occurrence=r.nextDate;
      const duplicate=state.transactions.some(t=>t.recurringId===r.id&&t.recurringOccurrence===occurrence);
      if(!duplicate)state.transactions.push({id:uid("tx"),type:r.type,amount:Number(r.amount),category:r.category,date:occurrence,note:r.note||r.category,createdAt:Date.now(),recurringId:r.id,recurringOccurrence:occurrence});
      r.lastProcessed=occurrence;r.nextDate=addFrequency(occurrence,r.frequency);changed=true;guard++;
    }
  });
  if(changed)saveState();
}
function openRecurring(id=null){
  editingRecurringId=id;recurringType="expense";
  if(id){
    const r=state.recurringTransactions.find(x=>x.id===id);if(!r)return;
    recurringType=r.type;$("#recurringModalTitle").textContent="Edit recurring";
    $("#recurringAmountInput").value=r.amount;$("#recurringFrequencyInput").value=r.frequency;$("#recurringDateInput").value=r.nextDate;$("#recurringNoteInput").value=r.note||"";
  }else{
    $("#recurringModalTitle").textContent="Recurring transaction";$("#recurringAmountInput").value="";$("#recurringFrequencyInput").value="monthly";$("#recurringDateInput").value=todayISO();$("#recurringNoteInput").value="";
  }
  $$(".type-button[data-recurring-type]").forEach(b=>b.classList.toggle("active",b.dataset.recurringType===recurringType));
  populateSelect("#recurringCategoryInput",CATEGORIES[recurringType]);
  openModal("#recurringModal");
}
function saveRecurring(){
  const amount=Number($("#recurringAmountInput").value),date=$("#recurringDateInput").value||todayISO(),category=$("#recurringCategoryInput").value;
  if(!amount||amount<=0)return toast("Enter a valid amount","!");
  if(editingRecurringId){
    const r=state.recurringTransactions.find(x=>x.id===editingRecurringId);
    Object.assign(r,{type:recurringType,amount,category,frequency:$("#recurringFrequencyInput").value,nextDate:date,note:$("#recurringNoteInput").value.trim()});
  }else{
    state.recurringTransactions.push({id:uid("rec"),type:recurringType,amount,category,frequency:$("#recurringFrequencyInput").value,nextDate:date,note:$("#recurringNoteInput").value.trim(),active:true,createdAt:Date.now()});
  }
  saveState();processRecurring();closeModal("#recurringModal");refreshApp();toast(editingRecurringId?"Recurring updated":"Recurring transaction created");
}
function toggleRecurring(id){const r=state.recurringTransactions.find(x=>x.id===id);if(!r)return;r.active=r.active===false;saveState();renderRecurring();toast(r.active?"Recurring resumed":"Recurring paused")}
function deleteRecurring(id){ask("Delete recurring transaction?","Its existing transactions will stay, but future automatic entries will stop.",()=>{state.recurringTransactions=state.recurringTransactions.filter(x=>x.id!==id);saveState();renderRecurring();toast("Recurring transaction deleted")})}

function updateStats(){
  const now=new Date(),period=state.currentPeriod;
  let start=new Date(now);let days=7;
  if(period==="month"){start=new Date(now.getFullYear(),now.getMonth(),1);days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()}
  if(period==="year"){start=new Date(now.getFullYear(),0,1);days=12}
  const startISO=start.toISOString().slice(0,10);
  const relevant=state.transactions.filter(t=>t.date>=startISO);
  const income=relevant.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0),expense=relevant.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  $("#statsIncome").textContent=money(income);$("#statsExpense").textContent=money(expense);
  $("#chartPeriodLabel").textContent=period==="week"?"Last 7 days":period==="month"?"This month":"This year";
  renderChart(period,now,days);renderCategoryStats(relevant);
}
function renderChart(period,now,days){
  const points=[];
  if(period==="year"){
    for(let i=0;i<12;i++){const key=`${now.getFullYear()}-${String(i+1).padStart(2,"0")}`;points.push({label:new Date(now.getFullYear(),i,1).toLocaleDateString(undefined,{month:"short"}),value:state.transactions.filter(t=>t.type==="expense"&&monthKey(t.date)===key).reduce((s,t)=>s+Number(t.amount),0)})}
  }else{
    for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);points.push({label:period==="month"?d.getDate():d.toLocaleDateString(undefined,{weekday:"short"}),value:state.transactions.filter(t=>t.type==="expense"&&t.date===key).reduce((s,t)=>s+Number(t.amount),0)})}
  }
  const max=Math.max(...points.map(p=>p.value),1);$("#expenseChart").innerHTML=points.map(p=>`<div class="chart-bar-wrapper"><div class="chart-bar" style="height:${Math.max(2,p.value/max*160)}px" title="${money(p.value)}"></div><span class="chart-bar-label">${p.label}</span></div>`).join("");
}
function renderCategoryStats(items){
  const totals={};items.filter(t=>t.type==="expense").forEach(t=>totals[t.category]=(totals[t.category]||0)+Number(t.amount));
  const rows=Object.entries(totals).sort((a,b)=>b[1]-a[1]);const el=$("#categoryStats");
  if(!rows.length){el.innerHTML=`<div class="empty-state compact">No expense data for this period.</div>`;return}
  el.innerHTML=rows.map(([cat,val])=>`<div class="category-stat"><div class="category-stat-top"><span class="category-stat-icon">${iconFor(cat)}</span><span class="category-stat-name">${esc(cat)}</span><span class="category-stat-value">${money(val)}</span></div></div>`).join("");
}

function openProfile(){ $("#nameInput").value=state.userName||"";openModal("#profileModal");setTimeout(()=>$("#nameInput").focus(),100)}
function saveProfile(){const name=$("#nameInput").value.trim()||"CBN";state.userName=name;saveState();closeModal("#profileModal");refreshApp();toast("Profile updated")}
function ask(title,message,callback){$("#confirmTitle").textContent=title;$("#confirmMessage").textContent=message;confirmCallback=callback;openModal("#confirmModal")}
function clearAll(){state={...defaultState,transactions:[],categoryBudgets:[],savingsGoals:[],recurringTransactions:[]};saveState();closeModal("#confirmModal");refreshApp();toast("All data cleared")}
function exportCSV(){
  const rows=[["Date","Type","Category","Amount","Currency","Note"]];
  state.transactions.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>rows.push([t.date,t.type,t.category,t.amount,state.currency,t.note||""]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`spendly-transactions-${todayISO()}.csv`;a.click();URL.revokeObjectURL(url);toast("CSV exported");
}

function refreshApp(){
  applyTheme();updateCurrencyUI();updateDashboard();renderTransactions();updateBudgetPage();renderGoals();renderRecurring();updateStats();
}

document.addEventListener("click",e=>{
  const nav=e.target.closest(".nav-item");if(nav){navigate(nav.dataset.page);return}
  const link=e.target.closest("[data-page-link]");if(link){navigate(link.dataset.pageLink);return}
  const action=e.target.closest("[data-action]");if(action){const a=action.dataset.action;if(a==="income"||a==="expense")openTransaction(a);if(a==="goal")openGoalModal();return}
  const delTx=e.target.closest("[data-delete-transaction]");if(delTx){ask("Delete transaction?","This transaction will be permanently removed.",()=>{state.transactions=state.transactions.filter(t=>t.id!==delTx.dataset.deleteTransaction);saveState();closeModal("#confirmModal");refreshApp();toast("Transaction deleted")});return}
  const delBud=e.target.closest("[data-delete-budget]");if(delBud){ask("Delete category budget?","The category limit will be removed.",()=>{state.categoryBudgets=state.categoryBudgets.filter(b=>b.id!==delBud.dataset.deleteBudget);saveState();closeModal("#confirmModal");refreshApp();toast("Budget deleted")});return}
  const delGoal=e.target.closest("[data-delete-goal]");if(delGoal){ask("Delete savings goal?","The goal and its saved amount record will be removed.",()=>{state.savingsGoals=state.savingsGoals.filter(g=>g.id!==delGoal.dataset.deleteGoal);saveState();closeModal("#confirmModal");refreshApp();toast("Goal deleted")});return}
  const goalMoney=e.target.closest("[data-goal-money]");if(goalMoney){openGoalMoney(goalMoney.dataset.goalMoney,goalMoney.dataset.goalMode);return}
  const delRec=e.target.closest("[data-delete-recurring]");if(delRec){deleteRecurring(delRec.dataset.deleteRecurring);return}
  const editRec=e.target.closest("[data-edit-recurring]");if(editRec){openRecurring(editRec.dataset.editRecurring);return}
  const toggleRec=e.target.closest("[data-toggle-recurring]");if(toggleRec){toggleRecurring(toggleRec.dataset.toggleRecurring);return}
  const filter=e.target.closest(".filter-button");if(filter){state.currentFilter=filter.dataset.filter;$$(".filter-button").forEach(b=>b.classList.toggle("active",b===filter));renderTransactions();return}
  const period=e.target.closest(".period-button");if(period){state.currentPeriod=period.dataset.period;saveState();$$(".period-button").forEach(b=>b.classList.toggle("active",b===period));updateStats();return}
  const txType=e.target.closest("[data-transaction-type]");if(txType){transactionType=txType.dataset.transactionType;$$(".type-button[data-transaction-type]").forEach(b=>b.classList.toggle("active",b.dataset.transactionType===transactionType));populateSelect("#categoryInput",CATEGORIES[transactionType]);$("#transactionModalTitle").textContent=transactionType==="income"?"Add Income":"Add Expense";return}
  const recType=e.target.closest("[data-recurring-type]");if(recType){recurringType=recType.dataset.recurringType;$$(".type-button[data-recurring-type]").forEach(b=>b.classList.toggle("active",b.dataset.recurringType===recurringType));populateSelect("#recurringCategoryInput",CATEGORIES[recurringType]);return}
  const cur=e.target.closest(".currency-option");if(cur){setCurrency(cur.dataset.currency,cur.dataset.symbol);return}
});

$("#themeBtn").addEventListener("click",toggleTheme);$("#themeSetting").addEventListener("click",toggleTheme);
$("#transactionSearch").addEventListener("input",renderTransactions);
$("#saveTransactionBtn").addEventListener("click",saveTransaction);$("#closeTransactionModal").addEventListener("click",()=>closeModal("#transactionModal"));
$("#editBudgetBtn").addEventListener("click",openBudgetModal);$("#addBudgetBtn").addEventListener("click",openCategoryBudgetModal);
$("#saveBudgetBtn").addEventListener("click",saveBudget);$("#closeBudgetModal").addEventListener("click",()=>closeModal("#budgetModal"));
$("#saveCategoryBudgetBtn").addEventListener("click",saveCategoryBudget);$("#closeCategoryBudgetModal").addEventListener("click",()=>closeModal("#categoryBudgetModal"));
$("#addGoalBtn").addEventListener("click",openGoalModal);$("#saveGoalBtn").addEventListener("click",saveGoal);$("#closeGoalModal").addEventListener("click",()=>closeModal("#goalModal"));
$("#saveGoalMoneyBtn").addEventListener("click",saveGoalMoney);$("#closeGoalMoneyModal").addEventListener("click",()=>closeModal("#goalMoneyModal"));
$("#addRecurringBtn").addEventListener("click",()=>openRecurring());$("#saveRecurringBtn").addEventListener("click",saveRecurring);$("#closeRecurringModal").addEventListener("click",()=>closeModal("#recurringModal"));
$("#editProfileBtn").addEventListener("click",openProfile);$("#saveProfileBtn").addEventListener("click",saveProfile);$("#closeProfileModal").addEventListener("click",()=>closeModal("#profileModal"));
$("#currencySetting").addEventListener("click",()=>openModal("#currencyModal"));$("#closeCurrencyModal").addEventListener("click",()=>closeModal("#currencyModal"));
$("#exportDataBtn").addEventListener("click",exportCSV);
$("#clearDataBtn").addEventListener("click",()=>ask("Clear all Spendly data?","This removes transactions, budgets, goals and recurring rules from this device.",clearAll));
$("#cancelConfirmBtn").addEventListener("click",()=>{confirmCallback=null;closeModal("#confirmModal")});
$("#confirmActionBtn").addEventListener("click",()=>{if(confirmCallback)confirmCallback()});
["#transactionModal","#budgetModal","#categoryBudgetModal","#goalModal","#goalMoneyModal","#recurringModal","#profileModal","#currencyModal","#confirmModal"].forEach(id=>$(id).addEventListener("click",e=>{if(e.target===e.currentTarget)closeModal(id)}));

function init(){
  $("#todayDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  populateTransactionCategories();setDefaultDates();applyTheme();updateCurrencyUI();
  $$(".period-button").forEach(b=>b.classList.toggle("active",b.dataset.period===state.currentPeriod));
  processRecurring();refreshApp();
}
document.addEventListener("DOMContentLoaded",init);
