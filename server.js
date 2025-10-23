const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库
const db = new sqlite3.Database('./promo_codes.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database.');
        // 创建促销码表
        db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            product_interest TEXT NOT NULL,
            contact TEXT NOT NULL,
            promo_code TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_used INTEGER DEFAULT 0,
            used_by TEXT,
            used_at DATETIME
        )`);
    }
});

// 中间件配置
app.use(express.json());
app.use(express.static(path.join(__dirname, 'promo-code'))); // 服务promo-code目录下的静态文件

// 允许跨域
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// 生成唯一促销码函数
function generatePromoCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PROMO-';
    
    for (let i = 0; i < 8; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
}

// API路由 - 提交表单并生成促销码
app.post('/api/generate', (req, res) => {
    const { name, productInterest, contact } = req.body;
    
    if (!name || !productInterest || !contact) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // 生成唯一促销码
    let promoCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
        promoCode = generatePromoCode();
        
        // 检查是否唯一
        db.get('SELECT COUNT(*) as count FROM promo_codes WHERE promo_code = ?', 
               [promoCode], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (row.count === 0) {
                isUnique = true;
                
                // 插入数据
                db.run(`INSERT INTO promo_codes (name, product_interest, contact, promo_code) 
                       VALUES (?, ?, ?, ?)`, 
                       [name, productInterest, contact, promoCode], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to save data' });
                    }
                    
                    res.json({
                        success: true,
                        promoCode: promoCode,
                        message: 'Promo code generated successfully'
                    });
                });
            }
        });
        
        if (isUnique) break;
        attempts++;
    }
    
    if (!isUnique) {
        return res.status(500).json({ error: 'Failed to generate unique promo code' });
    }
});

// API路由 - 销售核验促销码
app.get('/api/validate/:code', (req, res) => {
    const promoCode = req.params.code;
    
    if (!promoCode) {
        return res.status(400).json({ error: 'Promo code is required' });
    }
    
    db.get(`SELECT * FROM promo_codes WHERE promo_code = ?`, 
           [promoCode], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!row) {
            return res.json({ 
                valid: false, 
                message: 'Invalid promo code' 
            });
        }
        
        if (row.is_used) {
            return res.json({ 
                valid: false, 
                message: 'Promo code has already been used',
                usedBy: row.used_by,
                usedAt: row.used_at
            });
        }
        
        res.json({
            valid: true,
            message: 'Valid promo code',
            customerName: row.name,
            productInterest: row.product_interest,
            contact: row.contact,
            createdAt: row.created_at
        });
    });
});

// API路由 - 使用促销码
app.post('/api/use/:code', (req, res) => {
    const promoCode = req.params.code;
    const { salesPerson = 'Sales Representative' } = req.body;
    
    if (!promoCode || !salesPerson) {
        return res.status(400).json({ error: 'Promo code and sales person are required' });
    }
    
    db.run(`UPDATE promo_codes SET is_used = 1, used_by_sales = ?, used_at = datetime('now') 
           WHERE promo_code = ? AND is_used = 0`, 
           [salesPerson, promoCode], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.json({ 
                success: false, 
                message: 'Promo code not found or already used' 
            });
        }
        
        res.json({
            success: true,
            message: 'Promo code marked as used successfully'
        });
    });
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Promo Code API'
    });
});

// 重定向根路径到客户页面
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Promo code server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available:`);
    console.log(`   POST /api/generate`);
    console.log(`   GET  /api/validate/:code`);
    console.log(`   POST /api/use/:code`);
    console.log(`   GET  /api/health`);
    console.log(`🌐 Frontend pages:`);
    console.log(`   Customer: http://localhost:${PORT}/index.html`);
    console.log(`   Sales: http://localhost:${PORT}/sales_verification.html`);
});