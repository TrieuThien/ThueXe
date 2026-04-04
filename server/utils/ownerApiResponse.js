export function ownerSuccess(res, data = {}, meta = {}, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta,
        },
    });
}

export function ownerPaginated(res, items, { page, pageSize, total }, meta = {}) {
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    return ownerSuccess(
        res,
        { items },
        {
            page,
            pageSize,
            total,
            totalPages,
            ...meta,
        }
    );
}
