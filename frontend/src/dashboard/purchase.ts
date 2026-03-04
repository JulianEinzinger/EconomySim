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



await prepareData();
renderCategories();

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
                
                // add to shopping cart
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