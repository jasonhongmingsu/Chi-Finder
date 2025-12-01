# Chi-Finder 🛒✨

> A comprehensive smart retail platform integrating AI analytics, vending machine management, and user loyalty programs.

![Project Status](https://img.shields.io/badge/status-active-success.svg) ![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 📖 Introduction

**Chi-Finder** is a modern O2O (Online-to-Offline) solution for smart retail. It bridges the gap between vending machine operators and consumers. The platform not only provides operators with AI-driven sales insights and inventory management but also enhances user engagement through gamification, loyalty points, and personalized recommendations.

**Core Value Proposition:**
- **For Operators**: Optimize inventory and sales strategies via the `OperatorDashboard` and `AIAnalytics`.
- **For Users**: Enhance the shopping experience with the `PointsMall`, `LuckyDraw`, and location-based services.

## 🌟 Key Features

### 🤖 Smart Operations (AI & Management)
- **AI Sales Analytics**: (`AIAnalytics.js`) Visualizes sales trends and predictive insights to aid decision-making.
- **Smart Restock Suggestions**: (`RestockSuggestions.js`) Automatically generates restocking lists based on current inventory levels and historical sales data.
- **Machine Lifecycle Management**: (`ManageMachine.js`, `AddMachine.js`) Tools to add, monitor, and configure vending machines.
- **Real-time Inventory**: (`InventoryManagement.js`) Live tracking of stock across all deployed machines.

### 🎮 Engagement & Gamification
- **Lucky Draw**: (`LuckyDraw.js`, `rewards/`) Interactive components (like a Lucky Wheel) to boost user retention.
- **Points Mall**: (`PointsMall.js`) A loyalty system where users can redeem earned points for products or coupons.
- **Personalized Recommendations**: (`PersonalizedRecommendations.js`) dynamic product suggestions based on user profiles and history.
- **Machine Locator**: (`Map.js`) Geolocation service helping users find the nearest "Chi-Finder" machine.

### 💳 Transactions & Accounts
- **Digital Wallet**: (`Recharge.js`, `WalletTransaction.json`) Integrated wallet system for seamless top-ups and payments.
- **Order System**: (`BulkOrder.js`, `Purchase.json`) Supports both individual purchases and bulk ordering.
- **Wishlist**: (`Wishlist.js`) Allows users to save favorite items.

## 📂 Directory Structure

```text
Chi-Finder/
├── Components/                 # Reusable UI components & functional modules
│   ├── recommendations/        # Recommendation system components
│   ├── rewards/                # Gamification assets (e.g., LuckyWheel)
│   └── PersonalizedRecommendations.js
│
├── Entities/                   # Data Modeling & Schema Definitions
│   ├── Layout.js               # Global layout configuration
│   ├── AIRecommendation.json   # AI model output structure
│   ├── ActivityLog.json        # User interaction logs
│   ├── LuckyDrawPrize.json     # Configuration for prize pools
│   ├── VendingMachine.json     # Machine entity definitions
│   ├── SalesSummary.json       # Aggregated sales data structure
│   └── ... (User, Product, Coupon, etc.)
│
├── pages/                      # Application Routes & Views
│   ├── AIAnalytics.js          # AI Insights Dashboard
│   ├── OperatorDashboard.js    # Central Admin Console
│   ├── Map.js                  # Geolocation / Machine Finder
│   ├── LuckyDraw.js            # Gamification Page
│   ├── RestockSuggestions.js   # Smart Restocking Interface
│   ├── Profile.js              # User Profile & Settings
│   └── ...
│
├── LICENSE
└── README.md
