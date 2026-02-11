# EconomySim

# Table of Contents
1. [Pages](#pages)
2. [Game Design Ideas](#game-design-ideas)
    1. [Company-Slot Price Formula](#company-slot-price-scaling-formula)


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