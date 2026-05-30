"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMode = exports.PaymentStatus = exports.WhatsappLogStatus = exports.OrderStatus = exports.Gender = void 0;
var Gender;
(function (Gender) {
    Gender["MALE"] = "Male";
    Gender["FEMALE"] = "Female";
    Gender["OTHER"] = "Other";
})(Gender || (exports.Gender = Gender = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "Pending";
    OrderStatus["PREPARING"] = "Preparing";
    OrderStatus["READY_TO_DELIVER"] = "Ready to Deliver";
    OrderStatus["DELIVERED"] = "Delivered";
    OrderStatus["CANCELLED"] = "Cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var WhatsappLogStatus;
(function (WhatsappLogStatus) {
    WhatsappLogStatus["SENT"] = "Sent";
    WhatsappLogStatus["DELIVERED"] = "Delivered";
    WhatsappLogStatus["FAILED"] = "Failed";
})(WhatsappLogStatus || (exports.WhatsappLogStatus = WhatsappLogStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PAID"] = "Paid";
    PaymentStatus["UNPAID"] = "Unpaid";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMode;
(function (PaymentMode) {
    PaymentMode["CASH"] = "Cash";
    PaymentMode["UPI"] = "UPI";
    PaymentMode["CARD"] = "Card";
    PaymentMode["NET_BANKING"] = "Net Banking";
})(PaymentMode || (exports.PaymentMode = PaymentMode = {}));
//# sourceMappingURL=enums.js.map