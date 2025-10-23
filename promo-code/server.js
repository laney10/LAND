const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
    origin: ['https://1.excell-artica.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// 数据库初始化
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
            email TEXT NOT NULL,
            phone TEXT,
            promo_code TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_used INTEGER DEFAULT 0,
            used_by TEXT,
            used_at DATETIME
        )`);
    }
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

// API端点：生成促销码
app.post('/api/generate', async (req, res) => {
    try {
        const { name, productInterest, email, phone } = req.body;
        
        // 验证必填字段
        if (!name || !productInterest || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, product interest, and email are required' 
            });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid email format' 
            });
        }

        let promoCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        // 生成唯一促销码
        while (!isUnique && attempts < maxAttempts) {
            promoCode = generatePromoCode();
            
            const existingCode = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM promo_codes WHERE promo_code = ?', 
                       [promoCode], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
            
            if (existingCode === 0) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to generate unique promo code' 
            });
        }

        // 插入数据库
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO promo_codes (name, product_interest, email, phone, promo_code) 
                   VALUES (?, ?, ?, ?, ?)`, 
                   [name, productInterest, email, phone || null, promoCode], 
                   function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });

        res.json({
            success: true,
            promoCode: promoCode,
            message: 'Promo code generated successfully'
        });

    } catch (error) {
        console.error('Error generating promo code:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// API端点：验证促销码
app.get('/api/validate/:code', async (req, res) => {
    try {
        const promoCode = req.params.code.toUpperCase();
        
        if (!promoCode) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Promo code is required' 
            });
        }

        const promoData = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM promo_codes WHERE promo_code = ?`, 
                   [promoCode], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!promoData) {
            return res.json({ 
                valid: false, 
                message: 'Invalid promo code' 
            });
        }

        if (promoData.is_used) {
            return res.json({ 
                valid: false, 
                message: 'Promo code has already been used',
                usedBy: promoData.used_by,
                usedAt: promoData.used_at
            });
        }

        res.json({
            valid: true,
            message: 'Valid promo code',
            details: {
                name: promoData.name,
                productInterest: promoData.product_interest,
                email: promoData.email,
                phone: promoData.phone,
                createdAt: promoData.created_at
            }
        });

    } catch (error) {
        console.error('Error validating promo code:', error);
        res.status(500).json({ 
            valid: false, 
            message: 'Internal server error' 
        });
    }
});

// API端点：标记促销码为已使用
app.post('/api/use/:code', async (req, res) => {
    try {
        const promoCode = req.params.code.toUpperCase();
        const { usedBy = 'Sales Representative' } = req.body;
        
        if (!promoCode) {
            return res.status(400).json({ 
                success: false, 
                message: 'Promo code is required' 
            });
        }

        const result = await new Promise((resolve, reject) => {
            db.run(`UPDATE promo_codes SET is_used = 1, used_by = ?, used_at = datetime('now') 
                   WHERE promo_code = ? AND is_used = 0`, 
                   [usedBy, promoCode], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });

        if (result === 0) {
            return res.json({ 
                success: false, 
                message: 'Promo code not found or already used' 
            });
        }

        res.json({
            success: true,
            message: 'Promo code marked as used successfully'
        });

    } catch (error) {
        console.error('Error marking promo code as used:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// API端点：获取所有促销码（管理用）
app.get('/api/promocodes', async (req, res) => {
    try {
        const promoCodes = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM promo_codes ORDER BY created_at DESC`, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.json({
            success: true,
            data: promoCodes,
            count: promoCodes.length
        });

    } catch (error) {
        console.error('Error fetching promo codes:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Promo Code API'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Promo code server running on port ${PORT}`);
    console.log(`📊 Database: promo_codes.db`);
    console.log(`🌐 API endpoints:`);
    console.log(`   POST /api/generate - Generate new promo code`);
    console.log(`   GET  /api/validate/:code - Validate promo code`);
    console.log(`   POST /api/use/:code - Mark promo code as used`);
    console.log(`   GET  /api/promocodes - Get all promo codes (admin)`);
    console.log(`   GET  /api/health - Health check`);
});
