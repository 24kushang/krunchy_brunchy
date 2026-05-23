export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
}

export enum OrderStatus {
  PENDING = 'Pending',
  PREPARING = 'Preparing',
  READY_TO_DELIVER = 'Ready to Deliver',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

export enum WhatsappLogStatus {
  SENT = 'Sent',
  DELIVERED = 'Delivered',
  FAILED = 'Failed',
}

export enum OrderSource {
  WHATSAPP = 'WhatsApp',
  PHONE = 'Phone',
  INSTAGRAM = 'Instagram',
  WEBSITE = 'Website',
  WALK_IN = 'Walk-in',
}
