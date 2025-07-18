/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */

function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет прибыли от операции
  const { discount, sale_price, quantity } = purchase;
  const discountDecimal = discount / 100;
  const fullPrice = sale_price * quantity;
  const revenue = fullPrice * (1 - discountDecimal);
  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  let bonus = 0;
  if (index === 0) bonus = profit * 0.15;
  else if (index === 1 || index === 2) bonus = profit * 0.1;
  else if (index === total - 1) bonus = 0;
  else bonus = profit * 0.05;
  return round2(bonus);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (!data || typeof data !== "object") {
    throw new Error("Некорректные данные");
  }
  if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error("Ошибка при пустом массиве purchase_records");
  }
  if (!Array.isArray(data.products) || data.products.length === 0) {
    throw new Error("Ошибка при пустом массиве products");
  }
  if (
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Ошибка при пустом массиве purchase_records");
  }

  // @TODO: Проверка наличия опций
  if (!options || typeof options !== "object") {
    throw new Error("Не переданы опции с функциями расчёта");
  }
  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error(
      "Опции должны содержать функции calculateRevenue и calculateBonus"
    );
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    first_name: seller.first_name,
    last_name: seller.last_name,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((stat) => [stat.id, stat])
  );

  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id]; //Получаем продавца
    if (!seller) {
      return;
    }
    seller.sales_count += 1; // Увеличиваем кол-во продаж на 1
    seller.revenue += record.total_amount; // Увеличиваем общую сумму выручки на сумму чека
    //Перебор товаров в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Получаем товар из индекса
      if (!product) {
        // Пропускаем неизвестные товары
        return;
      }
      const cost = product.purchase_price * item.quantity; // Себестоимость товара= закупочная цена * кол-во
      const revenue = calculateRevenue(item); // выручка с учетом скидки
      const profit = revenue - cost; // прибыль = выручка - себестоимость
      seller.profit += profit; // увеличиваем общую прибыль продавца
      // создание ключа sku, если его нет
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity; // увеличение количества проданных товаров по sku
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, totalSellers, seller);
    // Топ 10 товаров
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: String(seller.id),
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: round2(seller.revenue),
    profit: round2(seller.profit),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    top_3_products: seller.top_3_products,
    bonus: round2(seller.bonus),
  }));
}

function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
