let components = [];
let connections = [];
let isConnecting = false;
let connectFromId = null;
let mousePos = { x: 0, y: 0 };

// สำหรับลากอุปกรณ์
let draggingId = null;
let dragOffset = { x: 0, y: 0 };

function addComponent(type) {
    const defaultValues = {
        resistor: { value: 100 },
        battery: { value: 9 },
        capacitor: { value: 1 },
        led: { value: 2 },      // แรงดันตกคร่อม LED
        switch: { value: 1 },   // 1 = ON, 0 = OFF
        lamp: { value: 10 },    // ความต้านทานหลอดไฟ
        diode: { value: 0.7 }   // แรงดันตกคร่อมไดโอด
    };
    const component = {
        type: type,
        id: Date.now() + Math.random(),
        position: { x: 50, y: 50 },
        ...defaultValues[type]
    };
    components.push(component);
    renderCircuit();
}

function renderCircuit() {
    const board = document.getElementById('circuit-board');
    // ลบทุกอย่างยกเว้น canvas
    Array.from(board.children).forEach(child => {
        if (child.id !== 'circuit-canvas') board.removeChild(child);
    });

    drawConnections();

    components.forEach(component => {
        const element = document.createElement('div');
        element.className = `component ${component.type}`;
        element.style.left = component.position.x + 'px';
        element.style.top = component.position.y + 'px';
        element.style.position = 'absolute';
        element.setAttribute('data-id', component.id);

        // SVG icon inline
        const iconDiv = document.createElement('span');
        iconDiv.className = 'compicon-svg';
        iconDiv.innerHTML = getComponentSVG(component.type);
        element.appendChild(iconDiv);

        // ข้อความ label
        const label = document.createElement('div');
        label.style.whiteSpace = 'pre-line';
        label.textContent = getComponentLabel(component);
        element.appendChild(label);

        // Drag & Drop (custom)
        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            draggingId = component.id;
            dragOffset.x = e.offsetX;
            dragOffset.y = e.offsetY;
            document.addEventListener('mousemove', handleComponentDrag);
            document.addEventListener('mouseup', handleComponentDrop);
        });

        // Double click เพื่อแก้ไขค่า
        element.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            showEditDialog(component);
        });

        // ปุ่มเชื่อมต่อสาย
        const connectBtn = document.createElement('button');
        connectBtn.textContent = '●';
        connectBtn.style.position = 'absolute';
        connectBtn.style.right = '-16px';
        connectBtn.style.top = '50%';
        connectBtn.style.transform = 'translateY(-50%)';
        connectBtn.style.zIndex = 2;
        connectBtn.style.width = '20px';
        connectBtn.style.height = '20px';
        connectBtn.style.borderRadius = '50%';
        connectBtn.style.border = 'none';
        connectBtn.style.background = '#888';
        connectBtn.style.color = '#fff';
        connectBtn.style.cursor = 'pointer';
        connectBtn.title = 'เชื่อมต่อสาย';

        connectBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startWireDrag(component.id, e);
        });
        element.appendChild(connectBtn);

        // รองรับ mouseup สำหรับปลายทาง
        element.addEventListener('mouseup', (e) => {
            if (isConnecting && connectFromId !== component.id) {
                finishWireDrag(component.id);
            }
        });

        board.appendChild(element);
    });
}

function getComponentLabel(component) {
    switch(component.type) {
        case 'resistor': return `R\n${component.value}Ω`;
        case 'battery': return `B\n${component.value}V`;
        case 'capacitor': return `C\n${component.value}F`;
        case 'led': return `LED\n${component.value}V`;
        case 'switch': return `SW\n${component.value ? 'ON' : 'OFF'}`;
        case 'lamp': return `Lamp\n${component.value}Ω`;
        case 'diode': return `D\n${component.value}V`;
        default: return '';
    }
}

function getComponentSVG(type) {
    switch(type) {
        case 'resistor':
            return `<svg width="28" height="28" viewBox="0 0 24 24"><polyline points="2,14 6,14 8,8 10,20 12,8 14,20 16,8 18,14 22,14" fill="none" stroke="#e67e22" stroke-width="2"/></svg>`;
        case 'battery':
            return `<svg width="28" height="28" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" fill="#2980b9"/><rect x="11" y="4" width="2" height="3" fill="#2980b9"/></svg>`;
        case 'capacitor':
            return `<svg width="28" height="28" viewBox="0 0 24 24"><line x1="8" y1="6" x2="8" y2="22" stroke="#27ae60" stroke-width="3"/><line x1="16" y1="6" x2="16" y2="22" stroke="#27ae60" stroke-width="3"/></svg>`;
        case 'led':
            return `<svg width="28" height="28" viewBox="0 0 24 24"><polygon points="12,8 16,20 8,20" fill="#c0392b"/><line x1="12" y1="2" x2="12" y2="8" stroke="#c0392b" stroke-width="2"/><line x1="10" y1="4" x2="14" y2="4" stroke="#c0392b" stroke-width="2"/></svg>`;
        case 'switch':
            return `<svg width="28" height="28" viewBox="0 0 24 24"><line x1="4" y1="22" x2="20" y2="6" stroke="#616161" stroke-width="3"/><circle cx="20" cy="6" r="2" fill="#616161"/></svg>`;
        case 'lamp':
            return `<svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="14" r="6" fill="#f1c40f" stroke="#f39c12" stroke-width="2"/></svg>`;
        case 'diode':
            return `<svg width="28" height="28" viewBox="0 0 24 24"><polygon points="6,8 18,14 6,20" fill="#8e44ad"/><line x1="18" y1="8" x2="18" y2="20" stroke="#8e44ad" stroke-width="2"/></svg>`;
        default:
            return '';
    }
}

// Drag logic
function handleComponentDrag(e) {
    if (draggingId === null) return;
    const board = document.getElementById('circuit-board');
    const rect = board.getBoundingClientRect();
    const comp = components.find(c => c.id === draggingId);
    if (comp) {
        comp.position.x = e.clientX - rect.left - dragOffset.x;
        comp.position.y = e.clientY - rect.top - dragOffset.y;
        renderCircuit();
    }
}
function handleComponentDrop(e) {
    draggingId = null;
    document.removeEventListener('mousemove', handleComponentDrag);
    document.removeEventListener('mouseup', handleComponentDrop);
}

// Wire logic
function startWireDrag(id, e) {
    isConnecting = true;
    connectFromId = id;
    mousePos = { x: 0, y: 0 };
    document.addEventListener('mousemove', handleWireMouseMove);
    document.addEventListener('mouseup', handleWireMouseUp);
}
function handleWireMouseMove(e) {
    const board = document.getElementById('circuit-board');
    const rect = board.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
    drawConnections();
}
function handleWireMouseUp(e) {
    isConnecting = false;
    connectFromId = null;
    document.removeEventListener('mousemove', handleWireMouseMove);
    document.removeEventListener('mouseup', handleWireMouseUp);
    drawConnections();
}
function finishWireDrag(toId) {
    if (!connections.some(c =>
        (c.from === connectFromId && c.to === toId) ||
        (c.from === toId && c.to === connectFromId)
    )) {
        connections.push({ from: connectFromId, to: toId });
    }
    isConnecting = false;
    connectFromId = null;
    document.removeEventListener('mousemove', handleWireMouseMove);
    document.removeEventListener('mouseup', handleWireMouseUp);
    drawConnections();
    renderCircuit();
}
function drawConnections() {
    const canvas = document.getElementById('circuit-canvas');
    if (!canvas) return;
    const board = document.getElementById('circuit-board');
    canvas.width = board.clientWidth;
    canvas.height = board.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาดสายไฟถาวร
    connections.forEach(conn => {
        const fromComp = components.find(c => c.id === conn.from);
        const toComp = components.find(c => c.id === conn.to);
        if (fromComp && toComp) {
            const fromX = fromComp.position.x + 30;
            const fromY = fromComp.position.y + 20;
            const toX = toComp.position.x + 30;
            const toY = toComp.position.y + 20;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.strokeStyle = '#d35400';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });

    // วาดสายไฟขณะลาก
    if (isConnecting && connectFromId !== null) {
        const fromComp = components.find(c => c.id === connectFromId);
        if (fromComp) {
            const fromX = fromComp.position.x + 30;
            const fromY = fromComp.position.y + 20;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(mousePos.x, mousePos.y);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

// Modal สำหรับแก้ไขค่าอุปกรณ์
function createEditModal(component) {
    // ลบ modal เดิมถ้ามี
    let oldModal = document.getElementById('edit-modal');
    if (oldModal) oldModal.remove();

    let label = '';
    let unit = '';
    let inputType = 'number';
    let min = '0.01';
    let step = '0.01';
    let value = component.value;
    if (component.type === 'resistor') { label = 'ความต้านทาน'; unit = 'Ω'; }
    if (component.type === 'battery') { label = 'แรงดัน'; unit = 'V'; }
    if (component.type === 'capacitor') { label = 'ค่าคาปาซิแตนซ์'; unit = 'F'; }
    if (component.type === 'led') { label = 'แรงดันตกคร่อม'; unit = 'V'; }
    if (component.type === 'lamp') { label = 'ความต้านทาน'; unit = 'Ω'; }
    if (component.type === 'diode') { label = 'แรงดันตกคร่อม'; unit = 'V'; }
    if (component.type === 'switch') {
        label = 'สถานะ';
        unit = '';
        inputType = 'select';
    }

    // Modal HTML
    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.3)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '24px 32px';
    box.style.borderRadius = '10px';
    box.style.boxShadow = '0 2px 16px #0002';
    box.style.minWidth = '260px';
    box.style.textAlign = 'center';

    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '12px';
    title.textContent = `แก้ไข${label}`;
    box.appendChild(title);

    let input;
    if (inputType === 'select') {
        input = document.createElement('select');
        input.style.fontSize = '1.1em';
        input.innerHTML = `<option value="1" ${component.value ? 'selected' : ''}>ON</option>
                           <option value="0" ${!component.value ? 'selected' : ''}>OFF</option>`;
    } else {
        input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.min = min;
        input.step = step;
        input.style.fontSize = '1.1em';
        input.style.width = '80px';
    }
    input.id = 'edit-value-input';
    box.appendChild(input);

    if (unit) {
        const unitSpan = document.createElement('span');
        unitSpan.textContent = ' ' + unit;
        unitSpan.style.marginLeft = '8px';
        box.appendChild(unitSpan);
    }

    box.appendChild(document.createElement('br'));
    box.appendChild(document.createElement('br'));

    const okBtn = document.createElement('button');
    okBtn.textContent = 'ตกลง';
    okBtn.style.marginRight = '12px';
    okBtn.onclick = () => {
        let val = inputType === 'select' ? Number(input.value) : Number(input.value);
        if (inputType === 'select') {
            component.value = val ? 1 : 0;
        } else if (!isNaN(val) && val > 0) {
            component.value = val;
        }
        modal.remove();
        renderCircuit();
    };
    box.appendChild(okBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'ยกเลิก';
    cancelBtn.onclick = () => modal.remove();
    box.appendChild(cancelBtn);

    modal.appendChild(box);
    document.body.appendChild(modal);

    input.focus();
}

function showEditDialog(component) {
    createEditModal(component);
}

function calculate() {
    const voltage = parseFloat(document.getElementById('voltage').value);
    const resistance = parseFloat(document.getElementById('resistance').value);

    if (isNaN(voltage) || isNaN(resistance) || resistance === 0) {
        alert('กรุณากรอกค่าให้ครบถ้วนและความต้านทานต้องไม่เป็นศูนย์');
        return;
    }

    // คำนวณตามกฎของโอห์ม
    const current = voltage / resistance;
    const power = voltage * current;

    document.getElementById('current').textContent = current.toFixed(2);
    document.getElementById('power').textContent = power.toFixed(2);
}

function calculateFromCircuit() {
    // สมมติวงจรอนุกรม: รวมแบตเตอรี่, ตัวต้านทาน, หลอดไฟ, LED, ไดโอด, สวิตช์ (ถ้า OFF = วงจรเปิด)
    let totalVoltage = 0;
    let totalResistance = 0;
    let openSwitch = false;

    components.forEach(c => {
        if (c.type === 'battery') totalVoltage += c.value;
        if (c.type === 'resistor' || c.type === 'lamp') totalResistance += c.value;
        if (c.type === 'led' || c.type === 'diode') totalResistance += (c.value / 0.02); // สมมติ LED/Diode ใช้ I=20mA
        if (c.type === 'switch' && c.value === 0) openSwitch = true;
    });

    // ถ้ามีสวิตช์ OFF วงจรเปิด
    let current = 0;
    let power = 0;
    if (!openSwitch && totalResistance > 0) {
        current = totalVoltage / totalResistance;
        power = totalVoltage * current;
    }

    document.getElementById('current').textContent = current.toFixed(3);
    document.getElementById('power').textContent = power.toFixed(3);
    document.getElementById('totalVoltage').textContent = totalVoltage.toFixed(2);
    document.getElementById('totalResistance').textContent = totalResistance.toFixed(2);
}

// เพิ่ม event listener สำหรับ drag and drop บนพื้นที่วาดวงจร
const circuitBoard = document.getElementById('circuit-board');
circuitBoard.addEventListener('dragover', (e) => e.preventDefault());
circuitBoard.addEventListener('drop', (e) => e.preventDefault());

// แสดงผลครั้งแรก
window.onload = () => renderCircuit();
