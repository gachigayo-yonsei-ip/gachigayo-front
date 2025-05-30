import { BottomSheet } from 'react-spring-bottom-sheet'
import 'react-spring-bottom-sheet/dist/style.css'
import './BottomSheet.css'
import { forwardRef } from 'react';

const CustomBottomSheet = forwardRef(function CustomBottomSheet({ children }, ref) {
  return (
    <BottomSheet
      open={true}
      snapPoints={({ maxHeight }) => [0.25 * maxHeight, 0.6 * maxHeight, 0.9 * maxHeight]}
      defaultSnap={({ snapPoints }) => snapPoints[1]}
      blocking={false}
      expandOnContentDrag
      scrollLocking={false}
    >
      {/* ✅ 여기 div에 ref 연결 */}
      <div ref={ref} className="bottom-sheet-scroll-content">
        {children}
      </div>
    </BottomSheet>
  );
});

export default CustomBottomSheet;
