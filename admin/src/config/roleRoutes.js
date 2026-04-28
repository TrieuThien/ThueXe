import {
    CalendarCheck2,
    Car,
    CircleDollarSign,
    CirclePlus,
    CircleUserRound,
    FileUser,
    LandPlot,
    LayoutDashboard,
    List,
    MapPinned,
    Megaphone,
    MessageCircleMore,
    Package,
    Receipt,
    ScrollText,
    Settings,
    ShieldCheck,
    SquareCheckBig,
    TicketPercent,
    User,
    UserPlus,
    UserRoundCog,
    UsersRound,
    Wallet,
    Waypoints,
} from "lucide-react";

export const ROLE_BASE_PATHS = {
    admin: "/admin",
    dispatcher: "/dispatcher",
};

export const DEFAULT_ROLE = "dispatcher";

const SHARED_PROFILE_ITEM = {
    label: "Thông tin của tôi",
    path: "profile",
    icon: FileUser,
};

export const MENU_BY_ROLE = {
    admin: [
        { label: "Tổng quan", path: "dashboard", icon: LayoutDashboard },
        {
            label: "Loại xe",
            icon: Car,
            subItems: [
                { label: "Tạo loại xe", path: "vehicle/create", icon: CirclePlus },
                { label: "Danh sách loại xe", path: "vehicles", icon: List },
            ],
        },
        {
            label: "Phí gọi xe",
            icon: CircleDollarSign,
            subItems: [
                { label: "Tạo phí gọi xe", path: "tariff/create", icon: CirclePlus },
                { label: "Danh sách phí gọi xe", path: "tariffs", icon: List },
            ],
        },
        {
            label: "Phí gọi xe theo khu vực",
            icon: LandPlot,
            subItems: [
                { label: "Tạo vùng", path: "area/create", icon: CirclePlus },
                { label: "Danh sách vùng", path: "areas", icon: List },
            ],
        },
        {
            label: "Tạo đơn gọi xe",
            icon: ShieldCheck,
            subItems: [
                { label: "Tạo đơn gọi xe", path: "booking/create", icon: CirclePlus },
                { label: "Điều phối", path: "booking/dispatch", icon: Waypoints },
                { label: "Danh sách đơn gọi xe", path: "bookings", icon: List },
                { label: "Lên lịch", path: "scheduled-bookings", icon: CalendarCheck2 },
            ],
        },
        {
            label: "Khách hàng",
            icon: User,
            subItems: [
                { label: "Thêm khách hàng", path: "customer/create", icon: CirclePlus },
                { label: "Danh sách khách hàng", path: "customers", icon: List },
            ],
        },
        {
            label: "Chủ xe",
            icon: UsersRound,
            subItems: [
                { label: "Thêm chủ xe", path: "vehicle-owner/create", icon: CirclePlus },
                { label: "Danh sách chủ xe", path: "vehicle-owners", icon: List },
            ],
        },
        {
            label: "Tài xế",
            icon: CircleUserRound,
            subItems: [
                { label: "Thêm tài xế", path: "driver/create", icon: CirclePlus },
                { label: "Danh sách tài xế", path: "drivers", icon: List },
            ],
        },
        {
            label: "Nhân viên",
            icon: UsersRound,
            subItems: [
                { label: "Thêm nhân viên", path: "staff/create", icon: UserPlus },
                { label: "Danh sách nhân viên", path: "staff", icon: UserRoundCog },
                { ...SHARED_PROFILE_ITEM },
            ],
        },
        {
            label: "Hồ sơ",
            icon: ScrollText,
            subItems: [
                { label: "Quản lý hồ sơ", path: "documents/definitions", icon: CirclePlus },
                { label: "Hồ sơ khách hàng", path: "documents/users", icon: User },
                { label: "Hồ sơ tài xế", path: "documents/drivers", icon: CircleUserRound },
                { label: "Hồ sơ chủ xe", path: "documents/vehicle-owners", icon: UsersRound },
                { label: "Hồ sơ phương tiện", path: "documents/vehicles", icon: Car },
            ],
        },
        { label: "Theo dõi vị trí", path: "map-tracking", icon: MapPinned },
        { label: "Quảng cáo di động", path: "banners", icon: Megaphone },
        { label: "Gói thuê chuẩn", path: "rental-packages", icon: Package },
        { label: "Đơn thuê xe / tài xế", path: "rental-bookings", icon: ScrollText },
        { label: "Mã giảm giá", path: "coupons", icon: TicketPercent },
        { label: "Chương trình tích điểm", path: "reward-points", icon: ShieldCheck },
        { label: "Giao dịch", path: "transactions", icon: Receipt },
        { label: "Ví", path: "wallets", icon: Wallet },
        { label: "Thanh toán", path: "payouts", icon: Receipt },
        { label: "Hỗ trợ", path: "chat-support", icon: MessageCircleMore },
        { label: "Cài đặt", path: "settings", icon: Settings },
        {
            label: "Báo cáo",
            icon: SquareCheckBig,
            subItems: [
                { label: "Báo cáo tài xế", path: "reports/drivers", icon: CircleUserRound },
                { label: "Báo cáo hoạt động", path: "reports/customers", icon: User },
                { label: "Báo cáo thanh toán", path: "reports/payments", icon: Receipt },
            ],
        },
    ],
    dispatcher: [
        { label: "Tổng quan", path: "dashboard", icon: LayoutDashboard },
        {
            label: "Điều phối",
            icon: ShieldCheck,
            subItems: [
                { label: "Tạo đơn gọi xe", path: "booking/create", icon: CirclePlus },
                { label: "Điều phối", path: "booking/dispatch", icon: Waypoints },
                { label: "Danh sách đơn gọi xe", path: "bookings", icon: List },
                { label: "Lên lịch", path: "scheduled-bookings", icon: CalendarCheck2 },
            ],
        },
        {
            label: "Khách hàng",
            icon: User,
            subItems: [
                { label: "Thêm khách hàng", path: "customer/create", icon: CirclePlus },
                { label: "Danh sách khách hàng", path: "customers", icon: List },
            ],
        },
        {
            label: "Tài xế",
            icon: CircleUserRound,
            subItems: [{ label: "Danh sách tài xế", path: "drivers", icon: List }],
        },
        {
            label: "Theo dõi vị trí",
            icon: MapPinned,
            path: "map-tracking"
        },
        { label: "Đơn thuê xe / tài xế", path: "rental-bookings", icon: ScrollText },
        {
            label: "Support Chat",
            path: "chat-support",
            icon: MessageCircleMore
        },
        {
            label: "Account",
            icon: FileUser,
            subItems: [{ ...SHARED_PROFILE_ITEM }],
        },
    ],
};

function flattenLeafItems(items) {
    return items.flatMap((item) => {
        if (item.subItems?.length) {
            return flattenLeafItems(item.subItems);
        }

        return item.path ? [item] : [];
    });
}

export function getBasePathByRole(role = DEFAULT_ROLE) {
    return ROLE_BASE_PATHS[role] || ROLE_BASE_PATHS[DEFAULT_ROLE];
}

export function buildRolePath(role, path = "") {
    const basePath = getBasePathByRole(role);
    return path ? `${basePath}/${path}` : basePath;
}

export function getRoleMenu(role = DEFAULT_ROLE) {
    return MENU_BY_ROLE[role] || MENU_BY_ROLE[DEFAULT_ROLE];
}

export function getRoleLeafRoutes(role = DEFAULT_ROLE) {
    return flattenLeafItems(getRoleMenu(role));
}

export function getDefaultPathForRole(role = DEFAULT_ROLE) {
    const [firstRoute] = getRoleLeafRoutes(role);
    return buildRolePath(role, firstRoute?.path || "dashboard");
}

