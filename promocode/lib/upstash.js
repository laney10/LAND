import { Redis } from '@upstash/redis';

// 初始化 Redis 客户端（环境变量会自动从 Vercel 注入）
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 键名常量
const PROMO_CODES_KEY = 'promo_codes';
const USED_CODES_KEY = 'used_promo_codes';
const CODE_INDEX_KEY = 'promo_code_index';

export async function savePromoCode(promoCode, userData) {
  const promoData = {
    ...userData,
    createdAt: new Date().toISOString(),
    isUsed: false,
    usedAt: null
  };
  
  // 使用哈希存储促销码数据
  await redis.hset(PROMO_CODES_KEY, { [promoCode]: JSON.stringify(promoData) });
  
  return promoData;
}

export async function getPromoCode(promoCode) {
  const promoData = await redis.hget(PROMO_CODES_KEY, promoCode);
  
  if (!promoData) {
    return null;
  }
  
  return JSON.parse(promoData);
}

export async function markPromoCodeAsUsed(promoCode) {
  const promoData = await getPromoCode(promoCode);
  
  if (!promoData) {
    return false;
  }
  
  // 更新促销码状态
  promoData.isUsed = true;
  promoData.usedAt = new Date().toISOString();
  
  await redis.hset(PROMO_CODES_KEY, { [promoCode]: JSON.stringify(promoData) });
  
  // 添加到已使用集合（便于统计）
  await redis.sadd(USED_CODES_KEY, promoCode);
  
  return true;
}

export async function getAllPromoCodes() {
  const allCodes = await redis.hgetall(PROMO_CODES_KEY);
  
  if (!allCodes) {
    return {};
  }
  
  // 解析所有 JSON 数据
  const result = {};
  for (const [code, data] of Object.entries(allCodes)) {
    if (data) {
      result[code] = JSON.parse(data);
    }
  }
  
  return result;
}

export async function getStats() {
  const totalCodes = await redis.hlen(PROMO_CODES_KEY);
  const usedCodes = await redis.scard(USED_CODES_KEY);
  
  return {
    total: totalCodes,
    used: usedCodes,
    available: totalCodes - usedCodes
  };
}

// 检查促销码是否已存在（避免重复）
export async function isCodeExists(promoCode) {
  const exists = await redis.hexists(PROMO_CODES_KEY, promoCode);
  return exists === 1;
}

// 初始化演示数据
export async function initDemoData() {
  const exists = await redis.hexists(PROMO_CODES_KEY, 'PROMO-DEMO-001');
  
  if (exists === 0) {
    const demoData = {
      'PROMO-DEMO-001': JSON.stringify({
        name: '演示用户',
        product: '高级套餐',
        contact: 'demo@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        isUsed: false
      }),
      'PROMO-DEMO-002': JSON.stringify({
        name: '测试用户',
        product: '企业版',
        contact: 'test@example.com',
        createdAt: '2024-01-02T00:00:00Z',
        isUsed: true,
        usedAt: '2024-01-03T00:00:00Z'
      })
    };
    
    await redis.hset(PROMO_CODES_KEY, demoData);
    await redis.sadd(USED_CODES_KEY, 'PROMO-DEMO-002');
    
    console.log('演示数据初始化完成');
  }
}
