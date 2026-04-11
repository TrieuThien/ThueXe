import assert from "node:assert/strict";
import { createCustomerHomeService } from "../services/customer/homeService.js";

function logPass(name) {
    console.log(`PASS: ${name}`);
}

function logFail(name, error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
}

function buildService() {
    return createCustomerHomeService({
        resolveCustomerContext: async () => ({
            userId: 99,
            routeId: 1,
            address: "25 Nguyen Hue, Quan 1, TP.HCM",
            accountType: 1,
            accountActive: 1,
            accountDeleted: 0,
            isActivated: 1,
        }),
        getCachedBanners: async () => [
            { id: 1, title: "Ưu đãi gọi xe", excerpt: "Giảm sốc", content: "", feature_img: "https://img/a.jpg" },
            { id: 2, title: "Thuê xe tự lái", excerpt: "", content: "Deal thuê xe", feature_img: "https://img/b.jpg" },
        ],
        getCachedRides: async () => [
            { id: 10, ride_type: "CALL_RIDE", ride_desc: "Đi nội thành", base_fare: 25000, minimum_fare: 25000 },
            { id: 11, ride_type: "RENTAL_CAR", ride_desc: "Tự lái", base_fare: 650000, minimum_fare: 650000 },
            { id: 12, ride_type: "RENTAL_DRIVER", ride_desc: "Có tài xế", base_fare: 900000, minimum_fare: 900000 },
            { id: 13, ride_type: "CALL_RIDE", ride_desc: "Sẽ bị cắt limit", base_fare: 10000, minimum_fare: 10000 },
        ],
        listQuickDestinationCandidatesByUser: async () => [
            { address: "Sân bay Tân Sơn Nhất", frequency: 8, last_used_at: "2026-04-10T09:00:00.000Z" },
            { address: "Landmark 81", frequency: 5, last_used_at: "2026-04-09T09:00:00.000Z" },
        ],
        listRecentRoutesByUser: async () => [
            {
                id: "booking_201",
                pickup_address: "Bến Thành",
                destination_address: "Sân bay",
                used_at: "2026-04-10T10:00:00.000Z",
                source_type: "booking",
                service_type: 0,
            },
            {
                id: "rental_301",
                pickup_address: "Quận 1",
                destination_address: "Đà Lạt",
                used_at: "2026-04-09T10:00:00.000Z",
                source_type: "rental",
                service_type: 1,
            },
            {
                id: "rental_302",
                pickup_address: "Quận 7",
                destination_address: "Vũng Tàu",
                used_at: "2026-04-08T10:00:00.000Z",
                source_type: "rental",
                service_type: 3,
            },
            {
                id: "booking_202",
                pickup_address: "Thủ Đức",
                destination_address: "Gò Vấp",
                used_at: "2026-04-07T10:00:00.000Z",
                source_type: "booking",
                service_type: 0,
            },
            {
                id: "booking_203",
                pickup_address: "Sẽ bị cắt limit",
                destination_address: "Sẽ bị cắt limit",
                used_at: "2026-04-06T10:00:00.000Z",
                source_type: "booking",
                service_type: 0,
            },
        ],
        findAvailableCouponsForCustomer: async () => ({
            items: [
                {
                    id: 1,
                    coupon_code: "SALE10",
                    coupon_title: "Giảm 10%",
                    discount_type: 0,
                    discount_value: 10,
                    expiry_date: "2026-04-20T00:00:00.000Z",
                },
                {
                    id: 2,
                    coupon_code: "SAVE30K",
                    coupon_title: "Giảm 30.000đ",
                    discount_type: 1,
                    discount_value: 30000,
                    expiry_date: "2026-04-30T00:00:00.000Z",
                },
                {
                    id: 3,
                    coupon_code: "SAVE50K",
                    coupon_title: "Giảm 50.000đ",
                    discount_type: 1,
                    discount_value: 50000,
                    expiry_date: "2026-05-01T00:00:00.000Z",
                },
                {
                    id: 4,
                    coupon_code: "SHOULD_BE_TRIMMED",
                    coupon_title: "Extra",
                    discount_type: 1,
                    discount_value: 10000,
                    expiry_date: "2026-05-01T00:00:00.000Z",
                },
            ],
        }),
    });
}

function assertHomeSchema(data) {
    assert.equal(typeof data.currentAddress, "string");
    assert.ok(Array.isArray(data.banners));
    assert.ok(Array.isArray(data.quickDestinations));
    assert.ok(Array.isArray(data.recentRoutes));
    assert.ok(Array.isArray(data.popularServices));
    assert.ok(Array.isArray(data.featuredCoupons));
}

async function testHomeSchemaContract() {
    const service = buildService();
    const data = await service.getCustomerHome({ userId: 99, userType: 1 }, {});

    assertHomeSchema(data);
    assert.equal(data.currentAddress, "25 Nguyen Hue, Quan 1, TP.HCM");
}

async function testHomeLimitsAndRideTypeMapping() {
    const service = buildService();
    const data = await service.getCustomerHome({ userId: 99, userType: 1 }, {});

    assert.equal(data.popularServices.length, 3);
    assert.equal(data.recentRoutes.length, 4);
    assert.equal(data.featuredCoupons.length, 3);

    assert.equal(data.recentRoutes[0].rideType, "CALL_RIDE");
    assert.equal(data.recentRoutes[1].rideType, "RENTAL_CAR");
    assert.equal(data.recentRoutes[2].rideType, "RENTAL_DRIVER");
}

async function testDiscountTextMapping() {
    const service = buildService();
    const data = await service.getCustomerHome({ userId: 99, userType: 1 }, {});

    assert.equal(data.featuredCoupons[0].discountText, "-10%");
    assert.equal(data.featuredCoupons[1].discountText, "-30.000đ");
}

const tests = [
    ["customer home schema contract", testHomeSchemaContract],
    ["customer home limits and ride type mapping", testHomeLimitsAndRideTypeMapping],
    ["customer home discount text mapping", testDiscountTextMapping],
];

let failed = 0;

for (const [name, run] of tests) {
    try {
        await run();
        logPass(name);
    } catch (error) {
        failed += 1;
        logFail(name, error);
    }
}

if (failed > 0) {
    console.error(`Tests failed: ${failed}`);
    process.exit(1);
}

console.log("All customer home tests passed.");
process.exit(0);

