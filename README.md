# EconomySim

# Table of Contents
1. [Pages](#pages)
2. [Game Design Ideas](#game-design-ideas)
    1. [Company-Slot Price Formula](#company-slot-price-scaling-formula)
    2. [Business Types](#business-types)
       1. [Retail](#retail)
          1. [Page Layout](#retail-pages)


## Pages
+ LogIn / Register - Page
+ Company Selection - Page

    + Company Overview
        + Unlock principle: At the start of the game, the player has **no available company slots.**
        + The first company slot is **free.**
        + Additional slots must be unlocked and become **progressively more expensive.**
        + Slot prices are calculated using a **scaling formula**, ensuring each new slot costs significantly more than the previous one.

    + Selecting a company
        + Selecting an **existing company** redirects the player to that company's **main dashboard.**
        + The layout and available mechanics vary depending on the **company type** (e.g. manufacturing, services, gastronomy).
        + Some companies require **licenses or permits** (e.g. food service license, butcher license) before they can operate.

    + Founding a new company
        + Unlocking a new company slot automatically starts the **company founding process.**
        + During this process, the player selects:
            - Company type
            - Location
            - [idea] Starting capital?
            - Check of required licenses
        + Once completed, the company gets created and is from now on available in the company overview.

## Game Design Ideas

### Company slot price scaling formula
> Company slots use an exponential price scaling system to control expansion speed and > act as a long-term economic regulator.

#### Base variant
```math
SlotCost(n) = \begin{cases}
    Basecost * (Growthfactor ^{n-2}) & \text{if }~~ n ≥ 2 \\
    0 & \text{if }~~ n = 1
 \end{cases}
```

#### Scale with player-wealth
```math
SlotCost(n) = Basecost * (Growthfactor ^{n-2}) * (1 + Assets / 1.000.000)
```

<br>

Basecost = 10.000 <br>
Growthfactor = 1.85

### Business Types

#### Retail

The player can set opening times, and has a option to open/close the company. When the company is open, available items could possibly be sold to customers(automatic sale generator).

So, the player buys end-products from the commodity exchange(Warenbörse) in large amounts (e.g. 100stacks, 1.000 stacks, ...). 

[💡 idea] Depending on where you buy the items from, they take longer to arrive, based on where your company is located. (probably a bit complicated scaling time, so that it doesn't take too long, but is still realistic)

On arrival, the items get stored in the warehouse, which of course has limited space.

The warehouse capacity can be upgraded with money.

The player can choose for each item in the warehouse wether to put it up for sale, or maybe just a specific amount and set its price(option to set it netto and brutto getting calculated and vice versa.

##### Page Layout <a name="retail-pages"/>
###### Dashboard-Page:

Overview of number of sold Items in the last 24h, sales in the last 24h, profit in the last 24h

###### Inventory-Page

Overview of the inventory, including it's current size(in m³?) and the items stored currently, and a possibility to ourchase more space.

###### Economics-Page

Overview of all-time sales, profit, loss, best product. Some form of profit-and-loss statement, a possibility to take a loan from the bank, and to deposit/withdraw money to generate deposit interest and having to pay interest on the credit.
