// Common grocery items database
export const commonItems = [
  // Produce
  { id: 1, name: "Corn", category: "Produce", order: 1 },
  { id: 2, name: "Lettuce", category: "Produce", order: 2 },
  { id: 3, name: "Tomatoes", category: "Produce", order: 3 },
  { id: 4, name: "Onions - White", category: "Produce", order: 4 },
  { id: 5, name: "Onions - Red", category: "Produce", order: 5 },
  { id: 6, name: "Capsicum", category: "Produce", order: 6 },
  { id: 7, name: "Bananas", category: "Produce", order: 7 },
  { id: 8, name: "Oranges", category: "Produce", order: 8 },
  { id: 9, name: "Apples", category: "Produce", order: 9 },
  
  // Condiments & Sauces
  { id: 10, name: "Siracha", category: "Condiments", order: 10 },
  { id: 11, name: "Sweet Chilli Sauce", category: "Condiments", order: 11 },
  { id: 12, name: "Tomato Sauce", category: "Condiments", order: 12 },
  { id: 13, name: "BBQ Sauce", category: "Condiments", order: 13 },
  { id: 14, name: "Kewpie Mayo", category: "Condiments", order: 14 },
  { id: 15, name: "Dijon Mustard", category: "Condiments", order: 15 },
  { id: 16, name: "Mustard", category: "Condiments", order: 16 },
  
  // Mexican
  { id: 17, name: "Tortilla Shells - Jumbo", category: "Mexican", order: 17 },
  { id: 18, name: "Refried Beans", category: "Mexican", order: 18 },
  { id: 19, name: "Cholula", category: "Mexican", order: 19 },
  
  // Snacks
  { id: 20, name: "Seaweed Snacks", category: "Snacks", order: 20 },
  { id: 21, name: "Tortilla Chips", category: "Snacks", order: 24 },
  { id: 22, name: "Salsa", category: "Snacks", order: 25 },
  { id: 23, name: "Salt & Vinegar Chips", category: "Snacks", order: 26 },
  { id: 24, name: "Whittakers Chocolate", category: "Snacks", order: 27 },
  { id: 25, name: "Crackers", category: "Snacks", order: 32 },
  { id: 26, name: "Rice Crackers", category: "Snacks", order: 33 },
  
  // Beverages
  { id: 27, name: "Tropical Juice", category: "Beverages", order: 21 },
  { id: 28, name: "Maple Syrup", category: "Beverages", order: 22 },
  { id: 29, name: "Distilled Water", category: "Beverages", order: 23 },
  { id: 30, name: "Coffee Syrup", category: "Beverages", order: 34 },
  { id: 31, name: "Green Tea", category: "Beverages", order: 35 },
  { id: 32, name: "Regular Tea", category: "Beverages", order: 36 },
  
  // Pantry Staples
  { id: 33, name: "Peanut Butter", category: "Pantry", order: 28 },
  { id: 34, name: "Salt", category: "Pantry", order: 29 },
  { id: 35, name: "Pepper", category: "Pantry", order: 30 },
  { id: 36, name: "Ground Spice", category: "Pantry", order: 31 },
  { id: 37, name: "Smoked Paprika", category: "Pantry", order: 31 },
  { id: 38, name: "Flour", category: "Pantry", order: 37 },
  { id: 39, name: "Sugar", category: "Pantry", order: 38 },
  { id: 40, name: "Tuna", category: "Pantry", order: 39 },
  { id: 41, name: "Spaghetti", category: "Pantry", order: 40 },
  { id: 42, name: "White Rice", category: "Pantry", order: 41 },
  { id: 43, name: "Instant Noodles", category: "Pantry", order: 42 },
  { id: 44, name: "Sunflower Oil", category: "Pantry", order: 43 },
  { id: 45, name: "Olive Oil", category: "Pantry", order: 44 },
  { id: 46, name: "Sesame Oil", category: "Pantry", order: 45 },
  
  // Personal Care
  { id: 47, name: "Tissues", category: "Personal Care", order: 46 },
  { id: 48, name: "Razor Blades", category: "Personal Care", order: 47 },
  { id: 49, name: "Deodorant", category: "Personal Care", order: 48 },
  { id: 50, name: "Wet Wipes", category: "Personal Care", order: 49 },
  { id: 51, name: "Shampoo", category: "Personal Care", order: 50 },
  { id: 52, name: "Body Wash", category: "Personal Care", order: 51 },
  { id: 53, name: "Conditioner", category: "Personal Care", order: 52 },
  
  // Frozen
  { id: 54, name: "Dumplings", category: "Frozen", order: 53 },
  { id: 55, name: "Frozen Berries", category: "Frozen", order: 54 },
  { id: 56, name: "Ice Cream", category: "Frozen", order: 55 },
  { id: 57, name: "Ice Cream Sticks", category: "Frozen", order: 56 },
  { id: 58, name: "Ice", category: "Frozen", order: 57 },
  { id: 59, name: "Chicken Nuggets", category: "Frozen", order: 58 },
  { id: 60, name: "Chicken Bites", category: "Frozen", order: 59 },
  { id: 61, name: "Fries", category: "Frozen", order: 60 },
  { id: 62, name: "Pizza Bases", category: "Frozen", order: 61 },
  
  // Dairy & Deli
  { id: 63, name: "Pesto", category: "Deli", order: 62 },
  { id: 64, name: "Ham", category: "Deli", order: 63 },
  { id: 65, name: "Sour Cream", category: "Dairy", order: 64 },
  { id: 66, name: "Hummus", category: "Deli", order: 65 },
  { id: 67, name: "Bacon", category: "Deli", order: 66 },
  { id: 68, name: "Cheese - Mainland Colby", category: "Dairy", order: 67 },
  { id: 69, name: "Cheese - Mainland Tasty", category: "Dairy", order: 68 },
  
  // Household
  { id: 70, name: "Paper Towels", category: "Household", order: 69 },
  { id: 71, name: "Toilet Paper", category: "Household", order: 70 },
  { id: 72, name: "Purple Cloths", category: "Household", order: 71 },
  { id: 73, name: "Blue Cloths", category: "Household", order: 72 },
  { id: 74, name: "White Vinegar", category: "Household", order: 73 },
  { id: 75, name: "Dishwasher Tablets", category: "Household", order: 74 },
  { id: 76, name: "Laundry Soap", category: "Household", order: 75 },
  { id: 77, name: "Hand Soap - Foaming", category: "Household", order: 76 }
];

// Category colors for UI
export const categoryColors = {
  "Produce": "#51CF66",
  "Condiments": "#FF6B6B",
  "Mexican": "#FFE66D",
  "Snacks": "#FF8E8E",
  "Beverages": "#4ECDC4",
  "Pantry": "#F7B731",
  "Personal Care": "#B197FC",
  "Frozen": "#74C0FC",
  "Deli": "#FF8787",
  "Dairy": "#FFD43B",
  "Household": "#8CE99A"
};

// Search function
export function searchCommonItems(query) {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return commonItems.filter(item => 
    item.name.toLowerCase().includes(lowerQuery)
  ).sort((a, b) => {
    // Prioritize items that start with the query
    const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
    const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    // Then sort by original order
    return a.order - b.order;
  });
}
