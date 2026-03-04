import type { Wholesaler, WholesalerProduct } from "@economysim/shared";
import { Utils } from "../utils.js";

await Utils.checkAuth();

const cardsContainer = document.querySelector('.main-cards');
const backBtn = document.getElementById('back-button');

//#region StateMachine

type ViewState =
    | { type: 'categories' }
    | { type: 'wholesalers'; category: string}
    | { type: 'products', wholesaler: string, category: string };

let currentView: ViewState = { type: 'categories' };

backBtn!.onclick = () => {
    if(currentView.type === 'products') {
        renderWholesalers(currentView.category);
    } else {
        renderCategories();
    }
}

//#endregion

//#region Data loading

let wholesalers: Wholesaler[] = [];
const categories = new Map<string, {
    img: string;
    wholesalers: Wholesaler[];
}>();

async function prepareData() {
    const wholesalersResult = await fetch('http://localhost:3000/wholesalers');

    if(wholesalersResult.ok) {
            wholesalers = await wholesalersResult.json();
    } 

    wholesalers.forEach(wholesaler => {
        wholesaler.products.forEach(product => {
            if(!categories.has(product.product_category)) {
                categories.set(product.product_category, {
                    img: product.category_img_url,
                    wholesalers: []
                });
            }
            const entry = categories.get(product.product_category);
            if(!entry?.wholesalers.includes(wholesaler)) {
                entry?.wholesalers.push(wholesaler);
            }
        });
    });
}

//#endregion


function renderCategories() {
    cardsContainer!.innerHTML = '';
    for(const category of categories.keys()) {
        const card = document.createElement('div');
        card.classList.add('card');

        const img = document.createElement('img');
        img.src = `http://localhost:3000/imgs/${categories.get(category)?.img}`
        img.alt = category;

        const span = document.createElement('span');
        span.classList.add('font-weight-bold');
        span.textContent = category;

        card.appendChild(img);
        card.appendChild(span);

        card.onclick = () => renderWholesalers(category);

        cardsContainer?.appendChild(card);
    }
}

function renderWholesalers(category: string) {
    currentView = { type: 'wholesalers', category: category };

    

    const wholesalerCategories: Map<string, Wholesaler[]> = new Map<string, Wholesaler[]>(); // <categoryName, Wholesaler[]>

    wholesalers.forEach(wholesaler => {
        wholesaler.products.forEach(product => {
            if(!wholesalerCategories.has(product.product_category)) {
                wholesalerCategories.set(product.product_category, []);
            }
            if(!wholesalerCategories.get(product.product_category)?.includes(wholesaler)){
                wholesalerCategories.get(product.product_category)?.push(wholesaler);
            }
        });
    });

    cardsContainer!.innerHTML = '';
    categories.get(category)?.wholesalers.forEach((w) => {
        const card = document.createElement('div');
        card.classList.add('card');

        const img = document.createElement('img');
        img.src = `http://localhost:3000/imgs/${w.logoUrl}`
        img.alt = `${w.name} logo`;

        const span = document.createElement('span');
        span.classList.add('font-weight-bold');
        span.textContent = w.name;

        card.appendChild(img);
        card.appendChild(span);

        card.onclick = () => renderProducts(w, category);

        cardsContainer?.appendChild(card);
    });
}

function renderProducts(wholesaler: Wholesaler, category: string) {
    currentView = { type: 'products', wholesaler: wholesaler.name, category: category };

    cardsContainer!.innerHTML = '';

    wholesaler.products.forEach(p => {
        if(p.product_category === category) {
            const card = document.createElement('div');
            card.classList.add('card');

            const img = document.createElement('img');
            img.src = `http://localhost:3000/imgs/${p.imgUrl}`
            img.alt = category;

            const title = document.createElement('span');
            title.classList.add('font-weight-bold');
            title.textContent = `${p.name}`;

            const txt2 = document.createElement('span');
            txt2.classList.add('font-weight-bold');
            txt2.textContent = `${p.order_unit}${p.unit}`;

            const txt3 = document.createElement('span');
            txt3.classList.add('font-weight-bold');
            txt3.textContent = `(${(p.price).toLocaleString('de-DE')} €)`;

            const btnPlus = document.createElement('button');
            btnPlus.classList.add('btn', 'btn-primary', 'btn-sm');
            btnPlus.innerHTML = 'Add';
            btnPlus.onclick = (e) => {
                e.stopPropagation();
                addToCart(wholesaler, p);
            };
            

            card.appendChild(img);
            card.appendChild(title);
            card.appendChild(txt2);
            card.appendChild(txt3);
            card.appendChild(btnPlus);

            card.onclick = (e) => {
                // maybe future card logic?
            };

            cardsContainer?.appendChild(card);
        }
    })
}

type CartItem = {
    product: WholesalerProduct,
    quantity: number
};

type WholesalerCart = {
    wholesaler: Wholesaler;
    items: Map<number, CartItem>; // productId -> CartItem
};

let carts = new Map<number, WholesalerCart>(); // key = wholesaler.id

function addToCart(wholesaler: Wholesaler, product: WholesalerProduct) {
    let cart = carts.get(wholesaler.id);

    if(!cart) {
        cart = {
            wholesaler,
            items: new Map()
        };
        carts.set(wholesaler.id, cart);
    }

    const existing = cart.items.get(product.id);

    if(existing) {
        existing.quantity++;
    } else {
        cart.items.set(product.id, {
            product,
            quantity: 1
        });
    }

    // Carts im session storage speichern
    saveCartsToSessionStorage();

    renderCarts();
}

const cartgroupsDiv = document.getElementById('cart-groups')!;

function renderCarts() {
    cartgroupsDiv.innerHTML = '';

    if (carts.size === 0) {
        cartgroupsDiv.innerHTML = '<div class="cart-empty">Cart is empty</div>';
        return;
    }

    for(const cart of carts.values()) {
        const group = document.createElement('div');
        group.classList.add('cart-group');

        const header = document.createElement('div');
        header.classList.add('cart-group-header');
        header.textContent = cart.wholesaler.name;

        const itemsDiv = document.createElement('div');
        let subtotal = 0;

        for(const { product, quantity } of cart.items.values()) {
            const row = document.createElement('div');
            row.classList.add('cart-row');

            const name = document.createElement('span');
            name.textContent = product.name;

            const qty = document.createElement('span');
            qty.textContent = `x${quantity*product.order_unit}${product.unit}`;

            const price = product.price * quantity;
            subtotal += price;

            const cost = document.createElement('span');
            cost.textContent = `${price.toLocaleString('de-DE')} €`;

            const btnMinus = document.createElement('button');
            btnMinus.textContent = '-';
            btnMinus.onclick = () => removeFromCart(cart.wholesaler.id, product.id);

            row.append(btnMinus, name, qty, cost);
            itemsDiv.appendChild(row);
        }

        const subtotalDiv = document.createElement('div');
        subtotalDiv.classList.add('card-subtotal');
        subtotalDiv.textContent = `Subtotal: ${subtotal.toLocaleString('de-DE')} €`;

        const checkoutBtn = document.createElement('button');
        checkoutBtn.classList.add('btn', 'btn-success', 'btn-sm', 'checkout-btn');
        checkoutBtn.textContent = 'Checkout';

        checkoutBtn.onclick = () => checkoutWholesaler(cart.wholesaler.id);

        group.append(header, itemsDiv, subtotalDiv, checkoutBtn);
        cartgroupsDiv.appendChild(group);
    }
}

function removeFromCart(wholesalerId: number, productId: number) {
    const cart = carts.get(wholesalerId);
    if(!cart) return;

    const item = cart.items.get(productId);
    if(!item) return;

    item.quantity--;
    
    if(item.quantity <= 0) {
        cart.items.delete(productId);
    }

    if(cart.items.size === 0) {
        carts.delete(wholesalerId);
    }

    // Carts im session storage speichern
    saveCartsToSessionStorage();

    renderCarts();
}

function checkoutWholesaler(wholesalerId: number) {
    const cart = carts.get(wholesalerId);
    if(!cart) return;

    const order = {
        wholesalerId,
        items: Array.from(cart.items.values()).map(ci => ({
            productId: ci.product.id,
            quantity: ci.quantity,
            price: ci.product.price
        }))
    };

    console.log('ORDER →', order);
    
    carts.delete(wholesalerId);
    renderCarts();
}

type StoredCart = {
    wholesalerId: number,
    items: {
        productId: number,
        quantity: number
    }[]
};

function saveCartsToSessionStorage() {
    const data: StoredCart[] = [];

    for(const cart of carts.values()) {
        data.push({
            wholesalerId: cart.wholesaler.id,
            items: Array.from(cart.items.values()).map(ci => ({
                productId: ci.product.id,
                quantity: ci.quantity
            }))
        });
    }

    sessionStorage.setItem('carts', JSON.stringify(data));
}

function loadCartsFromSessionStorage() {
    const json = sessionStorage.getItem('carts');
    if(!json) return;

    const stored: StoredCart[] = JSON.parse(json);

    carts = new Map();

    for(const sc of stored) {
        const wholesaler = wholesalers.find(w => w.id === sc.wholesalerId);
        if(!wholesaler) continue;

        const items = new Map<number, CartItem>();

        for(const item of sc.items) {
            const product = wholesaler.products.find(p => p.id === item.productId);
            if(!product) continue;

            items.set(product.id, {
                product: product,
                quantity: item.quantity
            });
        }

        carts.set(wholesaler.id, {
            wholesaler: wholesaler,
            items: items
        })
    }
}

await prepareData();
loadCartsFromSessionStorage();
renderCategories();
renderCarts();