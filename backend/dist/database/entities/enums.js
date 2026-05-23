"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderSource = exports.WhatsappLogStatus = exports.OrderStatus = exports.Gender = void 0;
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
var OrderSource;
(function (OrderSource) {
    OrderSource["WHATSAPP"] = "WhatsApp";
    OrderSource["PHONE"] = "Phone";
    OrderSource["INSTAGRAM"] = "Instagram";
    OrderSource["WEBSITE"] = "Website";
    OrderSource["WALK_IN"] = "Walk-in";
})(OrderSource || (exports.OrderSource = OrderSource = {}));
//# sourceMappingURL=enums.js.map