import { useMutation, useQuery } from "@tanstack/react-query";

import { QUERY_KEY_FACTORY } from "../../constants";
import { couponApi } from "../../services";

export function useCoupon() {
  const myCouponsQuery = useQuery({
    queryKey: QUERY_KEY_FACTORY.coupons.mine(),
    queryFn: couponApi.getMyAvailableCoupons,
  });

  const validateCouponMutation = useMutation({
    mutationFn: couponApi.validateCoupon,
  });

  const applyCouponMutation = useMutation({
    mutationFn: couponApi.applyCoupon,
  });

  return {
    myCouponsQuery,
    validateCouponMutation,
    applyCouponMutation,
  };
}
