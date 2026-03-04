import type { Wholesaler, WholesalerProduct } from "@economysim/shared";
import { Utils } from "../utils.js";

await Utils.checkAuth();

const cardsContainer = document.querySelector('.main-cards');
const backBtn = document.getElementById('back-button');

backBtn!.onclick = renderCategories;

let wholesalers: Wholesaler[] = [];
async function loadWholesalers() {
    const wholesalersResult = await fetch('http://localhost:3000/wholesalers');

    if(wholesalersResult.ok) {
        wholesalers = await wholesalersResult.json();
    }
}

await loadWholesalers();
renderCategories();

function renderCategories() {
    // split into categories
    const categories: Map<string, string> = new Map<string, string>(); // <categoryName, imgUrl>

    wholesalers.forEach(wholesaler => {
        wholesaler.products.forEach(product => {
            if(!categories.has(product.product_category)) {
                categories.set(product.product_category, product.category_img_url);
            }
        });
    });


    cardsContainer!.innerHTML = '';
    for(const category of categories.keys()) {
        const card = document.createElement('div');
        card.classList.add('card');

        const img = document.createElement('img');
        img.src = `http://localhost:3000/imgs/${categories.get(category)}`
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
    for(const wholesalerCategory of wholesalerCategories.keys()) {
        if(wholesalerCategory !== category) continue;

        wholesalerCategories.get(wholesalerCategory)?.forEach(w => {
            const card = document.createElement('div');
            card.classList.add('card');

            const img = document.createElement('img');
            //img.src = `http://localhost:3000/imgs/${w.imgUrl}`
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
}

function renderProducts(wholesaler: Wholesaler, category: string) {

}