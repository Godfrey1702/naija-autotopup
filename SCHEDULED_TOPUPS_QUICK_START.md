# Scheduled Top-Ups Quick Start Guide

## ⚡ 5-Minute Integration

### Step 1: Backend Deployment
✅ **Already Created:** `supabase/functions/cancel-managed-topup/index.ts`

Deploy to Supabase:
```bash
supabase functions deploy cancel-managed-topup
```

Verify deployment:
```bash
# Check logs
supabase functions describe cancel-managed-topup
```

### Step 2: Add to Navigation

In your main app navigation component (e.g., `src/components/layout/BottomNav.tsx`):

```typescript
import { Calendar } from "lucide-react";

// Add this menu item:
<button
  onClick={() => setCurrentView("scheduled-topups")}
  className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-secondary rounded-lg"
>
  <Calendar className="w-5 h-5" />
  <span className="text-xs">Scheduled</span>
</button>
```

### Step 3: Add View Route

In your main view switcher (e.g., `src/pages/Index.tsx`):

```typescript
import { ScheduledTopUpsView } from "@/components/views/ScheduledTopUpsView";

// In your view rendering logic:
{currentView === "scheduled-topups" && (
  <ScheduledTopUpsView onBack={() => setCurrentView("home")} />
)}
```

### Step 4: Update Navigation State

Add to your state:
```typescript
const [currentView, setCurrentView] = useState<
  "home" | "analytics" | "topup" | "wallet" | "settings" | "scheduled-topups"
>("home");
```

---

## 🧪 Testing the Implementation

### Test 1: Basic Functionality
```bash
# 1. Navigate to Scheduled Top-Ups section
# 2. Verify you see existing schedules (if any)
# 3. Click pause on an active schedule
#    ✅ Should pause successfully
# 4. Click resume
#    ✅ Should resume successfully
# 5. Click cancel
#    ✅ Should show confirmation, then cancel
```

### Test 2: Error Handling
```bash
# 1. Log out of the app
# 2. Try to call cancel-managed-topup directly (Network tab)
#    ✅ Should get 401 Unauthorized
# 3. Log back in
# 4. Try cancelling a completed schedule
#    ✅ Should get error about can't cancel completed
```

### Test 3: UI States
```bash
# 1. Click multiple buttons rapidly
#    ✅ Should only process once
# 2. During operation, buttons should be disabled
#    ✅ Verify disabled state
# 3. Check toast notifications appear
#    ✅ Success/error messages show
```

---

## 📋 Checklist

- [ ] Edge function deployed to Supabase
- [ ] Backend endpoint working (test with curl or Postman)
- [ ] Component integrated into app navigation
- [ ] Route added to main view switcher
- [ ] tested pause functionality
- [ ] Tested resume functionality
- [ ] Tested cancel functionality
- [ ] Tested error scenarios
- [ ] Check console for any errors
- [ ] Verify toast notifications appear

---

## 🐛 Troubleshooting

### Issue: "Function not found" when calling endpoint

**Solution:**
```bash
# Redeploy the function
supabase functions deploy cancel-managed-topup

# Check if function exists
supabase functions list

# Check function logs
supabase functions describe cancel-managed-topup
```

### Issue: 401 Unauthorized errors

**Solution:**
1. Verify user is logged in (check `useAuth()` context)
2. Check that auth token is being passed in headers
3. Verify SUPABASE_ANON_KEY is correct in `.env`

### Issue: Pause/Cancel doesn't update UI

**Solution:**
1. Check browser console for errors
2. Verify backend returned success response
3. Check that `fetchSchedules()` is being called after operation
4. Look at Network tab to see actual HTTP responses

### Issue: "Schedule not found" error

**Solution:**
1. Verify schedule ID being passed is correct
2. Check that user owns the schedule (not someone else's)
3. Verify `scheduled_topups` table has data for this user

### Issue: Component won't render

**Solution:**
```typescript
// Make sure you have the correct imports:
import { ScheduledTopUpsView } from "@/components/views/ScheduledTopUpsView";
import { useScheduledTopUps } from "@/hooks/useScheduledTopUps";

// Check that all UI components are imported:
// - Card
// - Badge
// - Button
// - DropdownMenu components
// - AlertDialog components
// - LoadingSpinner
```

---

## 📚 File Locations

```
src/
├── hooks/
│   └── useScheduledTopUps.ts          ← Hook for managing schedules
├── components/
│   └── views/
│       └── ScheduledTopUpsView.tsx    ← Main UI component
└── contexts/
    ├── AuthContext.tsx               ← Already exists
    ├── PhoneNumberContext.tsx         ← Already exists
    └── WalletContext.tsx              ← Already exists

supabase/
└── functions/
    └── cancel-managed-topup/
        └── index.ts                   ← Backend endpoint
```

---

## 📖 API Reference

### Hook Functions

```typescript
// Get all schedules
const { schedules } = useScheduledTopUps();

// Cancel a schedule
const { cancelSchedule } = useScheduledTopUps();
await cancelSchedule("schedule-id");

// Pause a schedule (only if active)
const { pauseSchedule } = useScheduledTopUps();
await pauseSchedule("schedule-id");

// Resume a schedule (only if paused)
const { resumeSchedule } = useScheduledTopUps();
await resumeSchedule("schedule-id");

// Toggle pause/resume automatically
const { togglePauseSchedule } = useScheduledTopUps();
const schedule = schedules[0];
await togglePauseSchedule(schedule);
```

### Backend Endpoints

```
DELETE /cancel-managed-topup?id={scheduleId}
  → Cancels a schedule

PATCH /cancel-managed-topup?id={scheduleId}&action=pause
  → Pauses a schedule

PATCH /cancel-managed-topup?id={scheduleId}&action=resume
  → Resumes a schedule
```

---

## 🔐 Security

The implementation includes:

✅ **Authentication**: Requires valid session token
✅ **Authorization**: Verifies schedule belongs to user
✅ **Validation**: Checks state transitions are valid
✅ **Input Sanitization**: IDs are validated before use
✅ **Error Handling**: Doesn't leak sensitive information

---

## 📱 User Experience

### Success Flow
```
User Action → Confirmation Dialog → Backend Call → Refresh Data → Toast Success
```

### Error Flow
```
User Action → Backend Error → Catch Error → Toast Error → User Retries
```

### Disabled States
```
While Operation → Buttons Disabled → "Processing..." UI → Operation Complete → Re-enable
```

---

## ✨ Features

✅ Pause/Resume schedules without deleting
✅ Permanent cancellation with confirmation
✅ Visual status badges for clarity
✅ Responsive error messages
✅ Automatic refetch after operations
✅ Loading states to prevent duplicate actions
✅ Toast notifications for user feedback
✅ Separation of active and past schedules
✅ Schedule details (next execution, frequency, etc.)
✅ Phone number and network info displayed

---

## 🚀 Production Checklist

- [ ] Edge function has rate limiting (optional)
- [ ] Error logging is set up
- [ ] User testing completed
- [ ] Error messages are user-friendly
- [ ] Loading states work correctly
- [ ] Mobile responsive design tested
- [ ] Accessibility features in place
- [ ] Documentation updated for data team

---

## 💡 Tips

1. **Test in Incognito**: Opens fresh browsing context
2. **Check DevTools**: Network tab shows all API calls
3. **Use Console**: Log responses to debug issues
4. **Read Error Messages**: They tell you what went wrong
5. **Check Component Path**: Make sure imports resolve correctly

---

## 🎯 Common Customizations

### Add delete all completed schedules button:
```typescript
const deleteAllCompleted = async () => {
  for (const schedule of pastSchedules) {
    await cancelSchedule(schedule.id);
  }
};
```

### Add schedule date picker:
```typescript
// Add a date picker component for one-time schedules
import { DatePicker } from "@/components/ui/date-picker";
```

### Add recurring schedule templates:
```typescript
// Create shortcuts for common patterns
const templates = {
  daily: { schedule_type: "daily", recurring_time: "09:00" },
  weeklyMonday: { schedule_type: "weekly", recurring_day_of_week: 1 },
  monthlyFirst: { schedule_type: "monthly", recurring_day_of_month: 1 },
};
```

---

Need help? Check the full documentation: `SCHEDULED_TOPUPS_DOCUMENTATION.md`
