import type { Mail, MailRow, WholesalerOrderItem } from "@economysim/shared";
import oracledb, { type Connection, type Result } from "oracledb";
const { BIND_OUT, NUMBER } = oracledb;
import { getDBConnection } from "../data.js";
import fs from "fs";
import Handlebars from "handlebars";

oracledb.fetchAsString = [oracledb.CLOB];

export class MailService {

    static formatDate(date: Date): string {
        return new Intl.DateTimeFormat("de-AT", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * Retrieves all mails for a company
     * @param companyId 
     */
    async getAllMailsForCompany(companyId: number): Promise<Mail[]> {
        try {
            const connection: Connection = await getDBConnection();

            const result: MailRow[] = (await connection.execute<MailRow>(`SELECT * FROM es_mails WHERE recipient_id = :company_id`, {
                company_id: companyId
            })).rows ?? [];

            await connection.close();

            return result.map(mr => ({
                id: mr.ID,
                recipientId: mr.RECIPIENT_ID,
                sender: mr.SENDER,
                subject: mr.SUBJECT,
                content: mr.CONTENT,
                isRead: mr.IS_READ,
                createdAt: mr.CREATED_AT,
                archivedAt: mr.ARCHIVED_AT
            }));
        } catch (err) {
            console.error(`Something happened while trying to retrieve mails for company with id ${companyId}: ${err}`);
            return [];
        }
    }

    /**
     * Retrieves a mail by it's id
     * @param mailId 
     * @param companyId 
     * @returns the Mail, if found, null if not found or the company does not have access to it
     */
    async getMailById(mailId: number): Promise<Mail | null> {
        try {
            const connection: Connection = await getDBConnection();

            const result: MailRow[] = (await connection.execute<MailRow>(`SELECT * FROM es_mails WHERE id = :mail_id`, {
                mail_id: mailId
            })).rows ?? [];

            await connection.close();

            const mail = result[0];

            if(mail) {
                return {
                    id: mail.ID,
                    recipientId: mail.RECIPIENT_ID,
                    sender: mail.SENDER,
                    subject: mail.SUBJECT,
                    content: mail.CONTENT,
                    isRead: mail.IS_READ,
                    createdAt: mail.CREATED_AT,
                    archivedAt: mail.ARCHIVED_AT
                };
            } else {
                return null;
            }
        } catch (err) {
            console.error(`Something happened while trying to retrieve mail with id ${mailId}: ${err}`);
            return null;
        }
    }

    /**
     * Marks a mail as read
     * @param mailId 
     * @param companyId 
     * @returns true if successful, false otherwise
     */
    async markAsRead(mailId: number, companyId: number): Promise<boolean> {
        try {
            const connection: Connection = await getDBConnection();

            const result: number = (await connection.execute(`UPDATE es_mails SET is_read = 1 WHERE id = :mail_id AND recipient_id = :company_id`, {
                mail_id: mailId,
                company_id: companyId
            })).rowsAffected ?? 0;

            await connection.commit();
            await connection.close();

            return !!result;
        } catch (err) {
            console.error(`Something happened while trying to mark mail with id ${mailId} as read: ${err}`);
            return false;
        }
    }

    /**
     * Sets a mail as archived
     * @param mailId 
     * @param companyId 
     * @returns 
     */
    async archiveMail(mailId: number, companyId: number): Promise<boolean> {
        try {
            const connection: Connection = await getDBConnection();

            const result: number = (await connection.execute(`UPDATE es_mails SET archived_at = :archive_date WHERE id = :mail_id AND recipient_id = :company_id`, {
                archive_date: new Date(),
                mail_id: mailId,
                company_id: companyId
            })).rowsAffected ?? 0;

            await connection.commit();
            await connection.close();

            return !!result;
        } catch (err) {
            console.error(`Something happened while trying to archive mail with id ${mailId}: ${err}`);
            return false;
        }
    }

    /**
     * Creates a new mail
     * @param companyId 
     * @param subject 
     * @param content 
     * @returns the mail id of the newly created mail, or -1 if failed
     */  
    async createMail<T extends keyof MailTemplates>(companyId: number, sender: string, subject: string, template: T, data: MailTemplates[T]): Promise<number> {
        const html = this.renderTemplate(template, data);

        try {
            const connection: Connection = await getDBConnection();

            const result: Result<{id: number[]}> = await connection.execute(`INSERT INTO es_mails (recipient_id, sender, subject, content, created_at)
                VALUES (:companyId, :sender, :subject, :content, :created_date) RETURNING id INTO :id`, {
                    companyId,
                    sender,
                    subject,
                    content: html,
                    created_date: new Date(),
                    id: { dir: BIND_OUT, type: NUMBER }
            });

            if(!result.outBinds) {
                throw new Error('SQL Outbinds are empty!');
            }

            const mailId: number | undefined = result.outBinds.id[0];

            if(!mailId) {
                throw new Error('Failed to retrieve mail ID from database!');
            }

            await connection.commit();
            await connection.close();

            return mailId;
           return -1;
        } catch (err) {
            console.error(`Something happened while trying to create a mail: ${err}`);
            return -1;
        }
    }

    

    renderTemplate(templateName: string, data: MailTemplates[keyof MailTemplates]): string {
        const file = fs.readFileSync(`mail_templates/${templateName}.hbs`, "utf-8");

        const template = Handlebars.compile(file);
        return template(data);
    }
}

export type MailTemplate_OrderConfirmationData = {
    wholesalerName: string,
    companyName: string,
    orderId: number,
    products: WholesalerOrderItem[],
    totalPrice: number
};

export type MailTemplate_InstallmentReminderData = {
    bankName: string,
    wholesalerName: string,
    loanNumber: string,
    dueDate: string,
    installmentAmount: number,
    bankIban: string
}

export type MailTemplates = {
    "order-confirmation": MailTemplate_OrderConfirmationData;
    "installment-reminder": MailTemplate_InstallmentReminderData;
};