const bcrypt = require('bcryptjs');

// Generate hashed password for 'admin123'
const adminHashedPassword = bcrypt.hashSync('admin123', 10);

module.exports = {
  users: [
    {
      id: 1,
      name: "Admin",
      email: "admin@chimshield.com",
      password: adminHashedPassword, // Hashed 'admin123'
      role: "admin",
      phone: "+265123456789",
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    // Test users (optional)
    {
      id: 2,
      name: "Test User",
      email: "user@example.com",
      password: bcrypt.hashSync('user123', 10), // Hashed 'user123'
      role: "user",
      phone: "+265987654321",
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
  ],
  teams: [
    {
      id: 1,
      name: "VIPs Services",
      type: "VIP Protection",
      location: "Lilongwe, Blantyre, Mzuzu",
      price: 180000,
      rating: 4.7,
      leader: "John Doe",
      members: ["Jane Smith", "Mike Johnson"],
      description: "Professional VIP protection team",
      bookingsCount: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: "Residential Security",
      type: "Residential Security",
      location: "Lilongwe, Blantyre, Mzuzu",
      price: 100000,
      rating: 5.0,
      leader: "Sarah Williams",
      members: ["David Brown", "Emily Davis"],
      description: "Security for residential buildings",
      bookingsCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: "Wedding Specialists",
      type: "Event Security",
      location: "Lilongwe, Blantyre, Mzuzu",
      price: 150000,
      rating: 4.2,
      leader: "Robert Wilson",
      members: ["Lisa Taylor", "James Anderson"],
      description: "Specialized security for weddings",
      bookingsCount: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  bookings: [],
  payments: [],
  reports: [],
  messages: [],

  // Helper function to generate next ID
  getNextId: function(collection) {
    return this[collection].length > 0 
      ? Math.max(...this[collection].map(item => item.id)) + 1 
      : 1;
  }
};