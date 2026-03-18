import {
    ChevronDown,
    FileUser,
    LayoutDashboard,
    MapPinned,
    Megaphone,
    Receipt,
    Settings,
    ShieldCheck,
    TicketPercent,
    UserRoundCog,
    UserPlus,
    UsersRound,
    Wallet,
    Car,
    CircleDollarSign,
    LandPlot,
    BookmarkCheck,
    User,
    CircleUserRound,
    ScrollText,
    MessageCircleMore,
    SquareCheckBig,
    CirclePlus,
    List,
    Waypoints,
    CalendarCheck2
} from "lucide-react";

export const ROLE_BASE_PATHS = {
    admin: "/admin",
    dispatcher: "/dispatcher",
};

export const DEFAULT_ROLE = "dispatcher";

const SHARED_PROFILE_ITEM = {
    label: "Thông tin cá nhân",
    path: "profile",
    icon: FileUser,
};

export const MENU_BY_ROLE = {
    admin: [
        {
            label: "Dashboard",
            path: "dashboard",
            icon: LayoutDashboard,
        },
        {
            label: "Quản lý xe",
            icon: Car,
            subItems: [
                { label: "Thêm xe mới", path: "vehicle/create", icon: CirclePlus },
                { label: "Danh sách xe", path: "vehicles", icon: List },
            ],
        },
        {
            label: "Thành phố | Giá dịch vụ",
            icon: CircleDollarSign,
            subItems: [
                { label: "Thêm giá dịch vụ", path: "tariff/create", icon: CirclePlus },
                { label: "Danh sách giá dịch vụ", path: "tariffs", icon: List },
            ],
        },
        {
            label: "Khu vực hoạt động",
            icon: LandPlot,
            subItems: [
                { label: "Thêm khu vực", path: "area/create", icon: CirclePlus },
                { label: "Danh sách khu vực", path: "areas", icon: List },
            ],
        },
        {
            label: "Đặt xe",
            icon: BookmarkCheck,
            subItems: [
                { label: "Tạo mới yêu cầu", path: "booking/create", icon: CirclePlus },
                { label: "Điều phối", path: "booking/dispatch", icon: Waypoints },
                { label: "Danh sách đặt xe", path: "bookings", icon: List },
                { label: "Danh sách hẹn đặt xe", path: "scheduled-bookings", icon: CalendarCheck2 },
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
            subItems: [
                { label: "Thêm tài xế", path: "driver/create", icon: CirclePlus },
                { label: "Danh sách tài xế", path: "drivers", icon: List },
            ],
        },
        {
            label: "Tài khoản nhân viên",
            icon: UsersRound,
            subItems: [
                { label: "Thêm nhân viên", path: "staff/create", icon: UserPlus },
                { label: "Quản lý nhân viên", path: "staff", icon: UserRoundCog },
                { ...SHARED_PROFILE_ITEM },
            ],
        },
        {
            label: "Quản lý hồ sơ",
            icon: ScrollText,
            subItems: [
                { label: "Hồ sơ khách hàng", path: "documents/users", icon: User },
                { label: "Hồ sơ tài xế", path: "documents/drivers", icon: CircleUserRound },
            ],
        },
        { label: "Bản đồ theo dõi", path: "map-tracking", icon: MapPinned },
        { label: "Gửi thông báo", path: "send-broadcast", icon: Megaphone },
        { label: "Phiếu giảm giá", path: "coupons", icon: TicketPercent },
        { label: "Chương trình tích điểm", path: "reward-points", icon: ShieldCheck },
        { label: "Giao dịch", path: "transactions", icon: Receipt },
        { label: "Quản lý ví", path: "wallets", icon: Wallet },
        { label: "Quản lý thanh toán", path: "payouts", icon: Receipt },
        { label: "Tin nhắn hỗ trợ", path: "chat-support", icon: MessageCircleMore },
        { label: "Cài đặt hệ thống", path: "settings", icon: Settings },
        {
            label: "Báo cáo",
            icon: SquareCheckBig,
            subItems: [
                { label: "Báo cáo tài xế", path: "reports/drivers", icon: CircleUserRound },
                { label: "Báo cáo khách hàng", path: "reports/customers", icon: User },
                { label: "Báo cáo thanh toán", path: "reports/payments", icon: Receipt },
            ],
        },
    ],
    dispatcher: [
        {
            label: "Dashboard",
            path: "dashboard",
            icon: LayoutDashboard,
        },
        {
            label: "Điều phối đặt xe",
            subItems: [
                { label: "Tạo mới yêu cầu", path: "booking/create" },
                { label: "Điều phối", path: "booking/dispatch" },
                { label: "Danh sách đặt xe", path: "bookings" },
                { label: "Danh sách hẹn đặt xe", path: "scheduled-bookings" },
            ],
        },
        {
            label: "Khách hàng",
            subItems: [
                { label: "Thêm khách hàng", path: "customer/create" },
                { label: "Danh sách khách hàng", path: "customers" },
            ],
        },
        {
            label: "Tài xế",
            subItems: [
                { label: "Danh sách tài xế", path: "drivers" },
            ],
        },
        {
            label: "Theo dõi và hỗ trợ",
            subItems: [
                { label: "Bản đồ theo dõi", path: "map-tracking" },
                { label: "Tin nhắn hỗ trợ", path: "chat-support" },
            ],
        },
        {
            label: "Tài khoản",
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
