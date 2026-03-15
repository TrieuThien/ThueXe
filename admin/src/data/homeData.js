import {
    Car,
    Building2,
    ShieldCheck,
    Clock,
    Users,
    BarChart3,
    FileText,
    Settings,
    Headphones,
    TrendingUp,
    Activity,
    ClipboardList,
    Truck,
    UserCheck,
    MapPin,
    History,
    LayoutDashboard,
    Lock,
    Wrench,
    PieChart,
    DollarSign,
    Gauge,
    Percent,
    BookOpen,
    CheckCircle,
    Zap,
    Eye,
} from "lucide-react";

// ==================== NAVBAR ====================
export const navLinks = [
    { label: "Giới thiệu", href: "#gioi-thieu" },
    { label: "Tính năng", href: "#tinh-nang" },
    { label: "Quy trình", href: "#quy-trinh" },
    { label: "Bảng giá", href: "#bang-gia" },
    { label: "FAQ", href: "#faq" },
];

// ==================== STATS ====================
export const stats = [
    {
        icon: Car,
        value: "10.000+",
        label: "Lượt đặt xe",
    },
    {
        icon: Building2,
        value: "500+",
        label: "Doanh nghiệp sử dụng",
    },
    {
        icon: ShieldCheck,
        value: "99.9%",
        label: "Uptime hệ thống",
    },
    {
        icon: Headphones,
        value: "24/7",
        label: "Hỗ trợ vận hành",
    },
];

// ==================== FEATURES ====================
export const featureGroups = [
    {
        icon: ClipboardList,
        title: "Quản lý yêu cầu thuê xe",
        description:
            "Tạo và theo dõi mọi yêu cầu thuê xe một cách nhanh chóng, chính xác trên nền tảng tập trung.",
        features: [
            "Tạo đơn thuê xe nhanh chóng",
            "Chọn loại xe phù hợp nhu cầu",
            "Đặt lịch thuê xe trước",
            "Theo dõi trạng thái đơn realtime",
            "Lưu trữ lịch sử đơn đặt",
        ],
    },
    {
        icon: Truck,
        title: "Dành cho Dispatcher",
        description:
            "Công cụ điều phối chuyên nghiệp giúp xử lý yêu cầu, phân bổ xe và gán tài xế hiệu quả.",
        features: [
            "Tiếp nhận yêu cầu tức thì",
            "Phân bổ xe phù hợp",
            "Gán tài xế nhanh chóng",
            "Theo dõi trạng thái chuyến đi",
            "Xử lý điều phối thông minh",
        ],
    },
    {
        icon: Settings,
        title: "Dành cho Admin",
        description:
            "Toàn quyền quản trị hệ thống: người dùng, phương tiện, tài xế và cấu hình vận hành.",
        features: [
            "Quản lý người dùng hệ thống",
            "Phân quyền role chi tiết",
            "Quản lý phương tiện & tài xế",
            "Cấu hình hệ thống linh hoạt",
            "Giám sát hoạt động toàn diện",
        ],
    },
    {
        icon: BarChart3,
        title: "Báo cáo vận hành",
        description:
            "Hệ thống báo cáo trực quan, minh bạch giúp đưa ra quyết định vận hành chính xác.",
        features: [
            "Thống kê chuyến đi chi tiết",
            "Báo cáo doanh thu theo kỳ",
            "Phân tích hiệu suất phương tiện",
            "Tỷ lệ sử dụng xe",
            "Nhật ký hoạt động hệ thống",
        ],
    },
];

// ==================== WORKFLOW ====================
export const workflowSteps = [
    {
        step: 1,
        icon: FileText,
        title: "Tạo yêu cầu thuê xe",
        description:
            "Người dùng tạo yêu cầu thuê xe trên hệ thống: chọn loại xe, thời gian, điểm đón và trả. Đơn được gửi tự động đến Dispatcher.",
    },
    {
        step: 2,
        icon: UserCheck,
        title: "Dispatcher tiếp nhận & điều phối",
        description:
            "Dispatcher nhận yêu cầu, kiểm tra xe khả dụng, phân bổ phương tiện phù hợp và gán tài xế. Mọi thao tác trên một giao diện duy nhất.",
    },
    {
        step: 3,
        icon: CheckCircle,
        title: "Theo dõi, hoàn tất & báo cáo",
        description:
            "Theo dõi trạng thái chuyến đi realtime. Sau khi hoàn tất, hệ thống tự động cập nhật báo cáo vận hành và lịch sử đặt xe.",
    },
];

// ==================== PRICING ====================
export const pricingPlans = [
    {
        name: "Basic",
        description: "Phù hợp cho doanh nghiệp nhỏ mới bắt đầu số hóa vận hành thuê xe.",
        price: "1.500.000",
        period: "tháng",
        highlighted: false,
        features: [
            "Tối đa 10 phương tiện",
            "1 tài khoản Dispatcher",
            "1 tài khoản Admin",
            "Quản lý yêu cầu cơ bản",
            "Báo cáo tổng quan",
            "Hỗ trợ email",
        ],
    },
    {
        name: "Standard",
        description: "Giải pháp toàn diện cho doanh nghiệp vận hành quy mô trung bình.",
        price: "3.500.000",
        period: "tháng",
        highlighted: true,
        badge: "Phổ biến nhất",
        features: [
            "Tối đa 50 phương tiện",
            "5 tài khoản Dispatcher",
            "3 tài khoản Admin",
            "Điều phối nâng cao",
            "Báo cáo chi tiết & xuất file",
            "Hỗ trợ qua chat & điện thoại",
            "Phân quyền nâng cao",
        ],
    },
    {
        name: "Enterprise",
        description: "Dành cho tập đoàn và doanh nghiệp lớn cần tùy chỉnh sâu.",
        price: "Liên hệ",
        period: "",
        highlighted: false,
        features: [
            "Không giới hạn phương tiện",
            "Không giới hạn tài khoản",
            "API tích hợp hệ thống",
            "Tùy chỉnh theo yêu cầu",
            "Báo cáo realtime & BI",
            "Hỗ trợ 24/7 chuyên biệt",
            "Triển khai on-premise",
            "SLA cam kết",
        ],
    },
];

// ==================== FAQ ====================
export const faqItems = [
    {
        question: "Hệ thống có hỗ trợ phân quyền không?",
        answer:
            "Có. ThueXe hỗ trợ phân quyền rõ ràng theo role. Admin có toàn quyền quản trị hệ thống, trong khi Dispatcher tập trung vào việc tiếp nhận và điều phối yêu cầu thuê xe. Mỗi role chỉ truy cập được các chức năng phù hợp.",
    },
    {
        question: "Dispatcher và Admin khác nhau thế nào?",
        answer:
            "Dispatcher là người trực tiếp xử lý yêu cầu thuê xe: tiếp nhận đơn, phân bổ xe, gán tài xế và theo dõi chuyến đi. Admin quản trị toàn hệ thống: quản lý người dùng, phương tiện, tài xế, cấu hình và xem báo cáo vận hành tổng thể.",
    },
    {
        question: "Có thể quản lý nhiều xe cùng lúc không?",
        answer:
            "Hoàn toàn có thể. Tùy theo gói dịch vụ, bạn có thể quản lý từ 10 đến không giới hạn phương tiện. Hệ thống hiển thị trạng thái từng xe (sẵn sàng, đang chạy, bảo trì) và hỗ trợ phân bổ thông minh.",
    },
    {
        question: "Có thể theo dõi lịch sử đặt xe không?",
        answer:
            "Có. Mọi yêu cầu thuê xe đều được lưu trữ đầy đủ với thông tin chi tiết: thời gian, loại xe, tài xế, trạng thái và kết quả chuyến đi. Bạn có thể tra cứu, lọc và xuất báo cáo lịch sử bất kỳ lúc nào.",
    },
    {
        question: "Hệ thống có responsive trên điện thoại không?",
        answer:
            "Có. Giao diện ThueXe được thiết kế responsive, hoạt động mượt mà trên mọi thiết bị: máy tính, tablet và điện thoại. Dispatcher có thể điều phối ngay trên mobile khi cần.",
    },
    {
        question: "Có thể tùy chỉnh theo đặc thù doanh nghiệp không?",
        answer:
            "Với gói Enterprise, chúng tôi hỗ trợ tùy chỉnh giao diện, quy trình vận hành, báo cáo và tích hợp API theo yêu cầu riêng của doanh nghiệp. Liên hệ đội ngũ tư vấn để được hỗ trợ chi tiết.",
    },
];

// ==================== ROLE DATA ====================
export const roleData = {
    dispatcher: {
        label: "Dispatcher",
        icon: Truck,
        description:
            "Quản lý và điều phối các yêu cầu thuê xe, phân bổ phương tiện và theo dõi trạng thái chuyến đi.",
        color: "blue",
    },
    admin: {
        label: "Admin",
        icon: Lock,
        description:
            "Quản trị người dùng, phương tiện, phân quyền và cấu hình vận hành toàn hệ thống.",
        color: "navy",
    },
};

// ==================== AUTH SHOWCASE ====================
export const showcaseFeatures = [
    {
        icon: Zap,
        title: "Điều phối tức thì",
        description: "Xử lý yêu cầu và phân bổ xe chỉ trong vài giây.",
    },
    {
        icon: Eye,
        title: "Giám sát toàn diện",
        description: "Theo dõi trạng thái xe, tài xế và chuyến đi realtime.",
    },
    {
        icon: BarChart3,
        title: "Báo cáo thông minh",
        description: "Dữ liệu vận hành trực quan, hỗ trợ ra quyết định nhanh.",
    },
    {
        icon: ShieldCheck,
        title: "Bảo mật & phân quyền",
        description: "Bảo vệ dữ liệu, phân quyền rõ ràng theo vai trò.",
    },
];
