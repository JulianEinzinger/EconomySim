import express from "express";
import cors from "cors";
import { userRouter } from "./router/userRouter.js";
import { loginRouter } from "./router/loginRouter.js";
import { locationRouter } from "./router/locationRouter.js";
import { businessRouter } from "./router/businessRouter.js";
import { itemRouter } from "./router/itemRouter.js";
import { devRouter } from "./router/devRouter.js";
import { wholesalerRouter } from "./router/wholesalerRouter.js";
import { orderRouter } from "./router/orderRouter.js";
import { WholesalerService } from "./services/wholesalerService.js";
import { mailRouter } from "./router/mailRouter.js";
import { MailService } from "./services/mailService.js";
import { bankRouter } from "./router/bankRouter.js";
import { LoanService } from "./services/loanService.js";
import { AccountService } from "./services/accountService.js";
import { TransactionService } from "./services/transactionService.js";


const PORT = 3000;

const app = express();

app.use(express.json());
app.use(cors());

app.use("/users", userRouter);
app.use("/login", loginRouter);
app.use("/locations", locationRouter);
app.use("/business", businessRouter);
app.use("/items", itemRouter);
app.use("/dev", devRouter);
app.use("/wholesalers", wholesalerRouter);
app.use("/orders", orderRouter);
app.use("/mails", mailRouter);
app.use("/bank", bankRouter);

app.use(express.static("resources"))

app.listen(PORT, () => console.log(`Server listening on: http://localhost:${PORT}`)
);

const wholesalerService: WholesalerService = new WholesalerService();

// ensure central bank account exists
await AccountService.getInstance().ensureCentralBankAccountExists();

// Game Loop
// every minute
const gameLoop = async () => {
    try {
        // check for overdue orders and update their status
        await wholesalerService.processOverdueOrders();
        // check delivery times and update order status if necessary
        await wholesalerService.processDeliveredOrders();
        // check for overdue loan installments and update their status + send mails
        await LoanService.getInstance().processOverdueInstallments();
        // complete pending transactions
        await TransactionService.getInstance().completePendingTransactions();
    } catch (error) {
        
    }

    setTimeout(gameLoop, 60000);
};

gameLoop();