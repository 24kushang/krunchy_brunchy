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

export enum PaymentStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
}

export enum PaymentMode {
  CASH = 'Cash',
  UPI = 'UPI',
  CARD = 'Card',
  NET_BANKING = 'Net Banking',
}

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
}
