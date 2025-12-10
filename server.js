const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());                    // permite que tu Android se conecte
app.use(express.json());            // para leer JSON del body

const FILE = '/tmp/expenses.json';


// Si no existe el archivo, crea uno vacío
if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ expenses: [], balance: 0 }, null, 2));
}

// Leer datos
function readData() {
    const data = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(data);
}

// Guardar datos
function writeData(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Ruta principal
app.get('/', (req, res) => {
    res.json({ message: "WalletTracker API Node.js - ¡FUNCIONA!" });
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

// Agregar un gasto
app.post('/expenses', (req, res) => {
    const { description, amount } = req.body;

    if (!description || !amount || amount <= 0) {
        return res.status(400).json({ error: "Faltan datos o monto inválido" });
    }

    const data = readData();
    const newExpense = {
        id: uuidv4(),
        description,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        photoBase64: null  // puedes mandar foto en base64 después
    };

    data.expenses.push(newExpense);
    data.balance -= parseFloat(amount);
    writeData(data);

    res.status(201).json(newExpense);
});

// Borrar todo (opcional)
app.delete('/reset', (req, res) => {
    writeData({ expenses: [], balance: 0 });
    res.json({ message: "Todo borrado" });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('================================');
    console.log('API TASKCLASS - ¡CORRIENDO!');
    if (process.env.PORT) {
        console.log('→ Desplegado en Render');
        console.log('→ URL: https://api-taskclass.onrender.com');
        console.log('→ Prueba: https://api-taskclass.onrender.com/tasks');
    } else {
        console.log('→ Modo local');
        console.log(`→ http://localhost:${PORT}/tasks`);
    }
    console.log('================================');
})