import type { ItemCategory } from '../models/enums';
import { NameNormalizer } from './NameNormalizer';

const KEYWORDS: [ItemCategory, string[]][] = [
  ['produce', [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'tomato', 'potato', 'sweet potato', 'onion',
    'garlic', 'ginger', 'carrot', 'lettuce', 'spinach', 'kale', 'cucumber', 'pepper', 'bell pepper',
    'avocado', 'berry', 'strawberry', 'blueberry', 'grape', 'mango', 'pineapple', 'plantain', 'yam',
    'cabbage', 'broccoli', 'mushroom', 'herb', 'cilantro', 'parsley', 'basil', 'celery', 'zucchini',
    'fruit', 'vegetable', 'salad', 'melon', 'watermelon', 'pear', 'peach', 'okra', 'pumpkin',
  ]],
  ['bakery', [
    'bread', 'bagel', 'croissant', 'bun', 'roll', 'baguette', 'tortilla', 'muffin', 'cake',
    'pastry', 'pita', 'wrap', 'donut', 'doughnut',
  ]],
  ['dairy', [
    'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'sour cream',
    'cream cheese', 'margarine', 'kefir',
  ]],
  ['meat', [
    'chicken', 'chicken breast', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage',
    'ham', 'mince', 'steak', 'goat', 'meat',
  ]],
  ['seafood', [
    'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'tilapia', 'mackerel', 'sardine',
    'cod', 'catfish', 'crayfish',
  ]],
  ['pantry', [
    'rice', 'pasta', 'spaghetti', 'noodle', 'flour', 'sugar', 'salt', 'oil', 'olive oil',
    'vegetable oil', 'palm oil', 'vinegar', 'sauce', 'ketchup', 'mayonnaise', 'mustard', 'spice',
    'cereal', 'oat', 'bean', 'lentil', 'honey', 'jam', 'peanut butter', 'stock', 'bouillon',
    'seasoning', 'tomato paste', 'garri', 'semolina', 'coffee', 'tea', 'black pepper',
  ]],
  ['frozen', ['ice cream', 'frozen', 'ice', 'frozen pizza', 'fries', 'frozen peas']],
  ['beverages', [
    'water', 'juice', 'soda', 'coke', 'beer', 'wine', 'sparkling water', 'lemonade',
    'malt', 'drink', 'kombucha',
  ]],
  ['snacks', [
    'chip', 'crisp', 'cookie', 'biscuit', 'chocolate', 'candy', 'popcorn', 'nut',
    'cracker', 'snack', 'gum', 'chin chin',
  ]],
  ['household', [
    'toilet paper', 'toilet roll', 'paper towel', 'tissue', 'detergent', 'soap', 'dish soap',
    'bleach', 'sponge', 'trash bag', 'bin bag', 'foil', 'cling film', 'battery', 'light bulb',
    'cleaner', 'laundry', 'fabric softener',
  ]],
  ['personalCare', [
    'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'lotion', 'razor',
    'sanitary pad', 'tampon', 'body wash', 'floss', 'sunscreen', 'hand wash',
  ]],
  ['baby', ['diaper', 'nappy', 'baby wipe', 'baby formula', 'formula', 'baby']],
  ['pets', ['dog food', 'cat food', 'cat litter', 'litter', 'pet food', 'kibble']],
];

/** Longest keyword first (stable), so "peanut butter" beats "butter" and "ice cream" beats "cream". */
const RANKED: [string, ItemCategory][] = KEYWORDS.flatMap(([category, words]) =>
  words.map((w): [string, ItemCategory] => [NameNormalizer.key(w), category]),
).sort((a, b) => b[0].length - a[0].length);

/**
 * Guesses an aisle for a new item from keywords. Only the cold-start guess: once a
 * user corrects an item's category the correction lives on the item.
 */
export const CategoryClassifier = {
  classify(name: string): ItemCategory {
    const padded = ` ${NameNormalizer.key(name)} `;
    for (const [keyword, category] of RANKED) {
      if (padded.includes(` ${keyword} `)) return category;
    }
    return 'other';
  },
};
