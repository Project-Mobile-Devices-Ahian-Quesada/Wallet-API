const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // necesario para fotos grandes

const FILE = 'expenses.json';

// Crear archivo si no existe
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

// Ruta principal
app.get('/', (req, res) => {
    res.json({ message: "WalletTracker API - ¡CORRIENDO!" });
});

// Obtener saldo
app.get('/balance', (req, res) => {
    const { balance } = readData();
    res.json({ balance });
});

// Obtener todos los gastos
app.get('/expenses', (req, res) => {
    const { expenses } = readData();
    res.json(expenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

// GUARDAR SALDO INICIAL
app.post('/initial-balance', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount < 0) {
        return res.status(400).json({ error: "Monto inválido" });
    }
    const data = readData();
    data.balance = parseFloat(amount);
    writeData(data);
    res.json({ success: true, balance: data.balance });
});

// AGREGAR GASTO (FOTOS FUNCIONAN)
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
        photoBase64: photoBase64 || null  // ← GUARDA LA FOTO SI LA ENVÍAS
    };

    data.expenses.push(newExpense);
    data.balance -= parseFloat(amount);
    writeData(data);

    res.status(201).json(newExpense);
});

// EDITAR GASTO
app.put('/expenses/:id', (req, res) => {
    const { id } = req.params;
    const { description, amount, photoBase64 } = req.body;

    const data = readData();
    const index = data.expenses.findIndex(e => e.id === id);

    if (index === -1) {
        return res.status(404).json({ error: "Gasto no encontrado" });
    }

    // Actualizamos solo lo que viene
    if (description) data.expenses[index].description = description;
    if (amount !== undefined) {
        const oldAmount = data.expenses[index].amount;
        data.expenses[index].amount = parseFloat(amount);
        data.balance += oldAmount - parseFloat(amount); // recalcular saldo
    }
    if (photoBase64 !== undefined) data.expenses[index].photoBase64 = photoBase64;

    writeData(data);
    res.json(data.expenses[index]);
});

// BORRAR GASTO
app.delete('/expenses/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    const index = data.expenses.findIndex(e => e.id === id);

    if (index === -1) {
        return res.status(404).json({ error: "No encontrado" });
    }

    data.balance += data.expenses[index].amount;
    data.expenses.splice(index, 1);
    writeData(data);
    res.json({ success: true });
});

// BORRAR TODO
app.delete('/reset', (req, res) => {
    writeData({ expenses: [], balance: 0 });
    res.json({ message: "Todo borrado" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('WalletTracker API - CORRIENDO EN RENDER');
});