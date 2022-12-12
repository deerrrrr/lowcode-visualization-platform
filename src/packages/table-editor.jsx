import { $tableDialog } from "@/components/TableDialog";
import deepcopy from "deepcopy";
import { ElButton, ElTag } from "element-plus";
import { computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    propConfig: { type: Object },
    modelValue: { type: Array }
  },
  emits: ['update:modelValue'],
  setup(props, ctx) {
    const data = computed({
      get() {
        return props.modelValue || []
      },
      set(newValue) {
        ctx.emit('update:modelValue', deepcopy(newValue))
      }
    })
    const add = () => {
      $tableDialog({
        config: props.propConfig,
        data: data.value,
        onConfirm(value) {
          data.value = value //当点击确定时，将数据进行更新
        }
      })

    }
    return () => {
      return (<div>
        {(!data.value || data.value.length == 0) && <ElButton onClick={add}>添加</ElButton>}
        {(data.value || []).map(item => <ElTag onClick={add}>{item[props.propConfig.table.key]}</ElTag>)}
      </div>)
    }
  }
})