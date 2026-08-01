import { Request, Response } from 'express';
import { billingService } from '@/modules/billing/services/billing.service';
import { StripeService } from '@/core/payments/StripeService';
import { signupCheckoutSchema, memberCheckoutSchema } from '@/modules/billing/validators/billing.validators';
import { ResponseHandler } from '@/core/response/ResponseHandler';
import { AuthenticationError, ValidationError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class BillingController {
  async createSignupCheckout(req: Request, res: Response): Promise<void> {
    const input = signupCheckoutSchema.parse(req.body);
    const result = await billingService.createSignupCheckout(input);
    ResponseHandler.ok(res, 'Checkout session created', result);
  }

  async createMemberCheckout(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AuthenticationError('User not authenticated');
    const input = memberCheckoutSchema.parse(req.body);
    const result = await billingService.createMemberCheckout(req.user.userId, input);
    ResponseHandler.ok(res, 'Checkout session created', result);
  }

  /**
   * Mounted with express.raw() ahead of the app's global express.json(), so
   * req.body here is the untouched raw Buffer Stripe's signature was
   * actually computed over -- verifying against a JSON-reparsed body would
   * fail for any payload whose key order or whitespace changed in transit.
   */
  async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      throw new ValidationError('Missing Stripe-Signature header');
    }

    const event = StripeService.constructWebhookEvent(req.body as Buffer, signature);
    logger.info('Stripe webhook received', { type: event.type, id: event.id });

    await billingService.handleWebhookEvent(event);
    res.status(200).json({ received: true });
  }
}

export const billingController = new BillingController();
