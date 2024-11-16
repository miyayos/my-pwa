// 状態の定義
const STATUS_TYPES = {
    PLANNED: '予定',
    CHECKED_IN: '出勤',
    CHECKED_OUT: '退勤',
    ABSENT: '欠勤'
};

// 状態に対応するクラス名
const STATUS_CLASSES = {
    [STATUS_TYPES.PLANNED]: 'status-planned',
    [STATUS_TYPES.CHECKED_IN]: 'status-checked-in',
    [STATUS_TYPES.CHECKED_OUT]: 'status-checked-out',
    [STATUS_TYPES.ABSENT]: 'status-absent'
};



// レコードを保持する配列
let records = [];

// DOM要素の取得
const addRecordBtn = document.getElementById('addRecordBtn');
const recordsBody = document.getElementById('recordsBody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const saveMemoBtn = document.getElementById('saveMemoBtn');

// 新規レコード追加
function addRecord() {
    const staffSelect = document.getElementById('staffSelect');
    const userNameInput = document.getElementById('userNameInput');
    const checkInTime = document.getElementById('checkInTime');
    const checkOutTime = document.getElementById('checkOutTime');

    if (!userNameInput.value.trim()) {
        alert('利用者名を入力してください');
        return;
    }

    const record = {
        id: Date.now(),
        status: STATUS_TYPES.PLANNED,
        staff: staffSelect.value,
        userName: userNameInput.value.trim(),
        checkInTime: checkInTime.value,
        checkOutTime: checkOutTime.value,
        lunchBreakStart: false,
        lunchBreakEnd: false,
        lunchBreakStartTime: null,
        lunchBreakEndTime: null,
        workHours: calculateWorkHours(checkInTime.value, checkOutTime.value)
    };

    records.push(record);
    renderRecords();
    resetInputs();
}

// 勤務時間の計算
function calculateWorkHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '';
    
    // 時間を分に変換する補助関数
    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // 分を時間形式（HH:MM）に変換する補助関数
    const minutesToTimeStr = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    };

    // 休憩時間（12:00-13:00）を分で定義
    const BREAK_START = timeToMinutes('12:00');
    const BREAK_END = timeToMinutes('13:00');
    
    // 出勤・退勤時間を分に変換
    const startMinutes = timeToMinutes(checkIn);
    const endMinutes = timeToMinutes(checkOut);
    
    // 勤務時間の計算
    let workMinutes = 0;
    
    // ケース1: 勤務時間が休憩時間を跨がない（前半のみ）
    if (startMinutes < BREAK_START && endMinutes <= BREAK_START) {
        workMinutes = endMinutes - startMinutes;
    }
    // ケース2: 勤務時間が休憩時間を跨がない（後半のみ）
    else if (startMinutes >= BREAK_END && endMinutes > BREAK_END) {
        workMinutes = endMinutes - startMinutes;
    }
    // ケース3: 勤務時間が休憩時間を跨ぐ
    else if (startMinutes < BREAK_START && endMinutes > BREAK_END) {
        // 休憩前の勤務時間 + 休憩後の勤務時間
        workMinutes = (BREAK_START - startMinutes) + (endMinutes - BREAK_END);
    }
    // ケース4: 勤務時間が休憩時間内で終わる
    else if (startMinutes < BREAK_START && endMinutes <= BREAK_END) {
        workMinutes = BREAK_START - startMinutes;
    }
    // ケース5: 勤務時間が休憩時間内から始まる
    else if (startMinutes >= BREAK_START && startMinutes < BREAK_END && endMinutes > BREAK_END) {
        workMinutes = endMinutes - BREAK_END;
    }
    // ケース6: 勤務時間が完全に休憩時間内
    else if (startMinutes >= BREAK_START && endMinutes <= BREAK_END) {
        workMinutes = 0;
    }

    // 勤務時間がない、または負の値の場合は空文字を返す
    if (workMinutes <= 0) return '';
    
    // 分を時間形式に変換して返す
    return minutesToTimeStr(workMinutes);
}

// オプション：休憩時間を含むかどうかを判定する関数（表示用）
function hasLunchBreak(checkIn, checkOut) {
    if (!checkIn || !checkOut) return false;
    
    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const startMinutes = timeToMinutes(checkIn);
    const endMinutes = timeToMinutes(checkOut);
    const breakStart = timeToMinutes('12:00');
    const breakEnd = timeToMinutes('13:00');

    return startMinutes < breakStart && endMinutes > breakEnd;
}

// 昼休憩の開始
function startLunchBreak(recordId) {
    const record = records.find(r => r.id === recordId);
    if (record) {
        // チェックボックスの状態を反転
        record.lunchBreakStart = !record.lunchBreakStart;
        
        if (record.lunchBreakStart) {
            // チェックが入った場合は現在時刻を設定
            record.lunchBreakStartTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } else {
            // チェックが外れた場合は時刻をクリア
            record.lunchBreakStartTime = null;
            // 戻りのチェックも連動してクリア
            record.lunchBreakEnd = false;
            record.lunchBreakEndTime = null;
        }
        renderRecords();
    }
}

// 昼休憩の終了
function endLunchBreak(recordId) {
    const record = records.find(r => r.id === recordId);
    if (record) {
        // 入りにチェックが入っていない場合は戻りのチェックを無効化
        if (!record.lunchBreakStart) {
            alert('昼休憩の入りを先にチェックしてください');
            return;
        }
        
        // チェックボックスの状態を反転
        record.lunchBreakEnd = !record.lunchBreakEnd;
        
        if (record.lunchBreakEnd) {
            // チェックが入った場合は現在時刻を設定
            record.lunchBreakEndTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } else {
            // チェックが外れた場合は時刻をクリア
            record.lunchBreakEndTime = null;
        }
        renderRecords();
    }
}

// レコードの状態更新
function updateRecordStatus(recordId, newStatus) {
    const record = records.find(r => r.id === recordId);
    if (record) {
        record.status = newStatus;
        if (newStatus === STATUS_TYPES.CHECKED_IN && !record.checkInTime) {
            record.checkInTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } else if (newStatus === STATUS_TYPES.CHECKED_OUT && !record.checkOutTime) {
            record.checkOutTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        }
        record.workHours = calculateWorkHours(record.checkInTime, record.checkOutTime);
        renderRecords();
    }
}

// レコード一覧の描画
// レコード一覧の描画（昼休憩部分のみ更新）
function renderRecords() {
    recordsBody.innerHTML = '';
    
    records.forEach(record => {
        const tr = document.createElement('tr');
        tr.className = `${STATUS_CLASSES[record.status]} ${record.lunchBreakStart && !record.lunchBreakEnd ? 'lunch-break-active' : ''}`;
        tr.dataset.recordId = record.id;
        
        tr.innerHTML = `
            <td>
                <select onchange="updateRecordStatus(${record.id}, this.value)">
                    ${Object.values(STATUS_TYPES).map(status => 
                        `<option value="${status}" ${status === record.status ? 'selected' : ''}>${status}</option>`
                    ).join('')}
                </select>
            </td>
            <td>${record.staff}</td>
            <td>${record.userName}</td>
            <td>${record.checkInTime}</td>
            <td>${record.checkOutTime}</td>
            <td>
                <div class="lunch-break-checkbox">
                    <input type="checkbox" id="lunch-start-${record.id}" 
                        ${record.lunchBreakStart ? 'checked' : ''} 
                        onchange="startLunchBreak(${record.id})">
                    <label for="lunch-start-${record.id}">入り</label>
                    ${record.lunchBreakStartTime ? `<span class="break-time">${record.lunchBreakStartTime}</span>` : ''}
                </div>
            </td>
            <td>
                <div class="lunch-break-checkbox">
                    <input type="checkbox" id="lunch-end-${record.id}" 
                        ${record.lunchBreakEnd ? 'checked' : ''} 
                        ${!record.lunchBreakStart ? 'disabled' : ''}
                        onchange="endLunchBreak(${record.id})">
                    <label for="lunch-end-${record.id}">戻り</label>
                    ${record.lunchBreakEndTime ? `<span class="break-time">${record.lunchBreakEndTime}</span>` : ''}
                </div>
            </td>
            <td>${record.workHours}</td>
            <td>
                <button onclick="editRecord(${record.id})" class="secondary-button">編集</button>
                <button onclick="deleteRecord(${record.id})" class="secondary-button">削除</button>
            </td>
        `;
        
        recordsBody.appendChild(tr);
    });
}

// レコードの削除
function deleteRecord(recordId) {
    if (confirm('このレコードを削除してもよろしいですか？')) {
        records = records.filter(record => record.id !== recordId);
        renderRecords();
    }
}

// レコードの編集
function editRecord(recordId) {
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const tr = document.querySelector(`tr[data-record-id="${recordId}"]`);
    if (!tr) return;

    tr.innerHTML = `
        <td>
            <select class="edit-status">
                ${Object.values(STATUS_TYPES).map(status => 
                    `<option value="${status}" ${status === record.status ? 'selected' : ''}>${status}</option>`
                ).join('')}
            </select>
        </td>
        <td>
            <select class="edit-staff">
                <option value="職員A担当" ${record.staff === '職員A担当' ? 'selected' : ''}>職員A担当</option>
                <option value="職員B担当" ${record.staff === '職員B担当' ? 'selected' : ''}>職員B担当</option>
            </select>
        </td>
        <td><input type="text" class="edit-userName" value="${record.userName}"></td>
        <td><input type="time" class="edit-checkInTime" value="${record.checkInTime}"></td>
        <td><input type="time" class="edit-checkOutTime" value="${record.checkOutTime}"></td>
        <td><input type="text" class="edit-lunchBreak" value="${record.lunchBreak}"></td>
        <td>${record.workHours}</td>
        <td>
            <button onclick="saveEdit(${recordId})" class="primary-button">保存</button>
            <button onclick="cancelEdit(${recordId})" class="secondary-button">キャンセル</button>
        </td>
    `;
}

// 編集内容を保存
function saveEdit(recordId) {
    const tr = document.querySelector(`tr[data-record-id="${recordId}"]`);
    if (!tr) return;

    const record = records.find(r => r.id === recordId);
    if (!record) return;

    const newStatus = tr.querySelector('.edit-status').value;
    const newStaff = tr.querySelector('.edit-staff').value;
    const newUserName = tr.querySelector('.edit-userName').value.trim();
    const newCheckInTime = tr.querySelector('.edit-checkInTime').value;
    const newCheckOutTime = tr.querySelector('.edit-checkOutTime').value;
    const newLunchBreak = tr.querySelector('.edit-lunchBreak').value;

    if (!newUserName) {
        alert('利用者名を入力してください');
        return;
    }

    // レコードの更新
    record.status = newStatus;
    record.staff = newStaff;
    record.userName = newUserName;
    record.checkInTime = newCheckInTime;
    record.checkOutTime = newCheckOutTime;
    record.lunchBreak = newLunchBreak;
    record.workHours = calculateWorkHours(newCheckInTime, newCheckOutTime);

    renderRecords();
}

// 編集をキャンセル
function cancelEdit(recordId) {
    renderRecords();
}

// 入力フィールドのリセット
function resetInputs() {
    document.getElementById('userNameInput').value = '';
    document.getElementById('checkInTime').value = '';
    document.getElementById('checkOutTime').value = '';
}

// CSV出力
function exportToCsv() {
    const headers = ['状態', '担当', '利用者名', '出勤時間', '退勤時間', '昼休憩入り', '昼休憩戻り', '勤務時間'];
    const csvContent = [
        headers.join(','),
        ...records.map(record => [
            record.status,
            record.staff,
            record.userName,
            record.checkInTime,
            record.checkOutTime,
            record.lunchBreakStartTime || '',
            record.lunchBreakEndTime || '',
            record.workHours
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '出退勤記録.csv';
    link.click();
}

// ソート機能
function sortRecords(key) {
    records.sort((a, b) => {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
        return 0;
    });
    renderRecords();
}

// イベントリスナーの設定
addRecordBtn.addEventListener('click', addRecord);
exportCsvBtn.addEventListener('click', exportToCsv);

// ソートボタンのイベントリスナー設定
document.querySelectorAll('.sort-button').forEach(button => {
    button.addEventListener('click', () => {
        sortRecords(button.dataset.sort);
    });
});

// メモの保存
saveMemoBtn.addEventListener('click', () => {
    const memoText = document.getElementById('memoText').value;
    localStorage.setItem('attendance_memo', memoText);
    alert('メモを保存しました');
});

//