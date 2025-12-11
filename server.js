const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const FILE = 'expenses.json';

if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ expenses: [], balance: 0 }, null, 2));
}

function readData() {
    const data = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(data);
}

function writeData(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Rutas existentes (las tienes perfectas)
app.get('/', (req, res) => res.json({ message: "WalletTracker API - ¡CORRIENDO!" }));
app.get('/balance', (req, res) => res.json({ balance: readData().balance }));
app.get('/expenses', (req, res) => {
    const { expenses } = readData();
    res.json(expenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
});
app.post('/initial-balance', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount < 0) return res.status(400).json({ error: "Monto inválido" });
    const data = readData();
    data.balance = parseFloat(amount);
    writeData(data);
    res.json({ success: true, balance: data.balance });
});

// === AÑADIR INGRESO (AHORA SÍ APARECE EN LA LISTA EN VERDE) ===
app.post('/add-income', (req, res) => {
    const { amount, description = "Ingreso manual" } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Monto inválido" });
    }

    const data = readData();

    // Guardamos como "gasto negativo" para que aparezca en la lista
    const newIncome = {
        id: uuidv4(),
        description,
        amount: -parseFloat(amount),  // NEGATIVO → el balance sube
        date: new Date().toISOString(),
        photoBase64: null,
        isIncome: true  // PARA IDENTIFICARLO EN LA APP
    };

    data.expenses.push(newIncome);
    data.balance += parseFloat(amount);
    writeData(data);

    res.json({ success: true, newBalance: data.balance });
});

// === RESTO DE TUS ENDPOINTS (perfectos) ===
app.post('/expenses', (req, res) => {
    const { description, amount, photoBase64 } = req.body;
    if (!description || !amount || amount <= 0) {
        return res.status(400).json({ error: "Faltan datos o monto inválido" });
    }

    const data = readData();
    const newExpense = {
        id: uuidv4(),
        description,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        photoBase64: photoBase64 || null,
        isIncome: false
    };

    data.expenses.push(newExpense);
    data.balance -= parseFloat(amount);
    writeData(data);

    res.status(201).json(newExpense);
});

app.put('/expenses/:id', (req, res) => {
    const { id } = req.params;
    const { description, amount, photoBase64 } = req.body;

    const data = readData();
    const index = data.expenses.findIndex(e => e.id === id);

    if (index === -1) return res.status(404).json({ error: "Gasto no encontrado" });

    const oldAmount = data.expenses[index].amount;

    if (description) data.expenses[index].description = description;
    if (amount !== undefined) {
        data.expenses[index].amount = parseFloat(amount);
        data.balance += oldAmount - parseFloat(amount);
    }
    if (photoBase64 !== undefined) data.expenses[index].photoBase64 = photoBase64;

    writeData(data);
    res.json(data.expenses[index]);
});

app.delete('/expenses/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    const index = data.expenses.findIndex(e => e.id === id);

    if (index === -1) return res.status(404).json({ error: "No encontrado" });

    data.balance += data.expenses[index].amount;
    data.expenses.splice(index, 1);
    writeData(data);
    res.json({ success: true });
});

app.delete('/reset-expenses-only', (req, res) => {
    const data = readData();
    data.expenses = [];
    writeData(data);
    res.json({ message: "Gastos borrados, saldo mantenido", balance: data.balance });
});

app.delete('/reset', (req, res) => {
    writeData({ expenses: [], balance: 0 });
    res.json({ message: "Todo borrado" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('WalletTracker API - CORRIENDO EN RENDER');
});