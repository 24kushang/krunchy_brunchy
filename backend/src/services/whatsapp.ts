import pool from '../config/db';

export interface WhatsAppPayload {
  recipient: string;
  message: string;
  templateType: 'OrderReceived' | 'OrderReady' | 'PaymentSuccess' | 'Promotion';
}

export class WhatsAppService {
  private static async logMessage(recipient: string, message: string, templateType: string, status: 'Sent' | 'Failed'): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO whatsapp_logs (recipient, message, template_type, status) VALUES ($1, $2, $3, $4)`,
        [recipient, message, templateType, status]
      );
    } catch (err) {
      console.error('Error logging WhatsApp message to DB:', err);
    }
  }

  public static async sendMessage(payload: WhatsAppPayload): Promise<{ success: boolean; status: string; message: string }> {
    const { recipient, message, templateType } = payload;
    const isSimulated = process.env.WHATSAPP_SIMULATE !== 'false';
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    console.log(`[WhatsApp Outbox] To: ${recipient} | Type: ${templateType}`);
    console.log(`Message: "${message}"`);

    // If simulating or keys are not provided, treat it as a success simulator
    if (isSimulated || !accountSid || !authToken || !fromPhone) {
      console.log('[WhatsApp Service] Running in SIMULATION mode.');
      await this.logMessage(recipient, message, templateType, 'Sent');
      return {
        success: true,
        status: 'Simulated',
        message: 'Message sent successfully (Simulated)'
      };
    }

    // Try sending real WhatsApp message via Twilio API using native node fetch
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', `whatsapp:${recipient}`);
      bodyParams.append('From', `whatsapp:${fromPhone}`);
      bodyParams.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twilio API responded with status ${response.status}: ${errorText}`);
      }

      await this.logMessage(recipient, message, templateType, 'Sent');
      return {
        success: true,
        status: 'Sent',
        message: 'Message sent successfully via Twilio'
      };
    } catch (err: any) {
      console.error('[WhatsApp Service] Real message delivery failed:', err.message);
      await this.logMessage(recipient, message, templateType, 'Failed');
      return {
        success: false,
        status: 'Failed',
        message: `Delivery failed: ${err.message}`
      };
    }
  }

  // Template 1: Order Confirmation (Pending status)
  public static async sendOrderReceived(
    customerName: string,
    contact: string,
    orderId: number,
    items: { name: string; quantity: number }[],
    totalPrice: number,
    expectedDeliveryDate: string,
    location: string
  ) {
    const itemsList = items.map(i => `- ${i.name} x${i.quantity}`).join('\n');
    const message = `Hi ${customerName},\n\nThank you for ordering with Krunchy! 🍪\n\nYour Order #${orderId} is received and is currently *Pending*.\n\n*Details:*\n${itemsList}\n\n*Total price:* Rs. ${totalPrice}\n*Expected Delivery:* ${expectedDeliveryDate}\n*Delivery Location:* ${location}\n\nWe will update you once your order is being prepared!`;
    
    return this.sendMessage({ recipient: contact, message, templateType: 'OrderReceived' });
  }

  // Template 2: Ready to be Delivered / Delivered
  public static async sendOrderReadyOrDelivered(
    customerName: string,
    contact: string,
    orderId: number,
    status: 'Ready' | 'Delivered',
    location: string
  ) {
    const message = status === 'Ready'
      ? `Hi ${customerName},\n\nGood news! Your Krunchy Order #${orderId} is *Ready to Deliver*! 🚀 It will be dispatched shortly to ${location}. Get ready for some crunch!`
      : `Hi ${customerName},\n\nYour Krunchy Order #${orderId} has been *Delivered* successfully! 🎉 We hope you enjoy it. Thank you for choosing Krunchy!`;

    return this.sendMessage({ recipient: contact, message, templateType: 'OrderReady' });
  }

  // Template 3: Payment Successful
  public static async sendPaymentSuccess(
    customerName: string,
    contact: string,
    orderId: number,
    totalPrice: number
  ) {
    const message = `Hi ${customerName},\n\nPayment Successful! 💳\n\nWe have received your payment of *Rs. ${totalPrice}* for Order #${orderId}.\n\nThank you for your payment!`;

    return this.sendMessage({ recipient: contact, message, templateType: 'PaymentSuccess' });
  }
}
