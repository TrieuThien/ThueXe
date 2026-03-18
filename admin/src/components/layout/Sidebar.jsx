import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { buildRolePath, getRoleMenu } from "../../config/roleRoutes";

function SidebarItem({ collapsed, isActive, isOpen, item, level, onToggle, role }) {
    const { icon: Icon, label, path, subItems } = item;
    const hasChildren = subItems?.length > 0;

    if (hasChildren) {
        return (
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={onToggle}
                    className={`flex w-full items-center rounded-2xl px-3 py-3 text-sm font-medium transition ${isActive
                            ? "text-white shadow-lg shadow-blue-950/30"
                            : "text-slate-300 hover:bg-slate-900 hover:text-white"
                        } ${collapsed ? "justify-center" : "gap-3"}`}
                    title={collapsed ? label : undefined}
                    aria-expanded={isOpen}
                >
                    {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
                    {!collapsed && (
                        <>
                            <span className="flex-1 text-left">{label}</span>
                            <ChevronDown
                                className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""
                                    }`}
                            />
                        </>
                    )}
                </button>

                {isOpen ? (
                    <div className="space-y-2">
                        {subItems.map((subItem) => (
                            <SidebarLeaf
                                key={`${subItem.label}-${subItem.path}`}
                                collapsed={collapsed}
                                item={subItem}
                                level={level + 1}
                                role={role}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <SidebarLeaf
            collapsed={collapsed}
            item={item}
            level={level}
            role={role}
        />
    );
}

function SidebarLeaf({ collapsed, item, level, role }) {
    const { icon: Icon, label, path } = item;
    const exactMatchOnly = path === "staff";

    return (
        <NavLink
            key={`${label}-${path}`}
            to={buildRolePath(role, path)}
            end={exactMatchOnly}
            className={({ isActive }) =>
                `group flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition ${isActive
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                } ${collapsed ? "justify-center" : `gap-3 ${level > 0 ? "pl-6" : ""}`}`
            }
            title={collapsed ? label : undefined}
        >
            {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
            {!collapsed && <span>{label}</span>}
        </NavLink>
    );
}

export default function Sidebar({ collapsed, role = "admin" }) {
    const { pathname } = useLocation();
    const [openMenus, setOpenMenus] = useState({});
    const menuItems = getRoleMenu(role);

    const isItemActive = (item) => {
        if (item.path && pathname === buildRolePath(role, item.path)) {
            return true;
        }

        return item.subItems?.some(isItemActive) ?? false;
    };

    useEffect(() => {
        const nextOpenMenus = {};

        const collectActiveParents = (items, level = 0) => {
            items.forEach((item) => {
                const itemKey = `${item.label}-${level}`;

                if (item.subItems?.length) {
                    if (isItemActive(item)) {
                        nextOpenMenus[itemKey] = true;
                    }

                    collectActiveParents(item.subItems, level + 1);
                }
            });
        };

        collectActiveParents(menuItems);
        setOpenMenus((prev) => ({ ...prev, ...nextOpenMenus }));
    }, [menuItems, pathname]);

    return (
        <aside
            className={`fixed left-0 top-[72px] z-40 h-[calc(100vh-72px)] border-r border-slate-200 bg-slate-950 text-slate-100 transition-all duration-300 overflow-y-auto overflow-x-hidden ${collapsed ? "w-20" : "w-[clamp(14rem,10vw,16rem)]"
                }`}
        >
            <div className="flex h-full flex-col px-3 py-4">
                <div className="mb-4 px-2">
                    <p
                        className={`text-[11px] uppercase tracking-[0.35em] text-slate-500 transition ${collapsed ? "text-center" : ""
                            }`}
                    >
                        {collapsed ? role.slice(0, 3).toUpperCase() : `${role} menu`}
                    </p>
                </div>

                <nav className="flex-1 space-y-2">
                    {menuItems.map((item, index) => {
                        const isActive = isItemActive(item);
                        const itemKey = `${item.label}-${index}`;
                        const isOpen = openMenus[itemKey] || isActive;

                        return (
                            <SidebarItem
                                key={itemKey}
                                collapsed={collapsed}
                                isActive={isActive}
                                isOpen={isOpen}
                                item={item}
                                level={0}
                                onToggle={() =>
                                    setOpenMenus((prev) => ({
                                        ...prev,
                                        [itemKey]: !isOpen,
                                    }))
                                }
                                role={role}
                            />
                        );
                    })}
                </nav>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-400">
                    {collapsed ? (
                        <p className="text-center leading-5">24/7</p>
                    ) : (
                        <div className="leading-5 text-center">
                            <p>
                                Hệ thống quản trị của Thuê Xe. <br />
                                Bản quyền 2026 &copy; Thuê Xe. <br />
                            </p>
                            <p> 
                                Author: Triệu Thiên
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
