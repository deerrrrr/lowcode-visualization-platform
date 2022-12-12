import { computed, defineComponent, inject, ref } from "vue";
import './editor.scss'
import EditorBlock from './editor-block.jsx'
import deepcopy from "deepcopy";
import { useMenuDragger } from "./useMenuDragger";
import { useFocus } from "./useFocus";
import { useBlockDragger } from "./useBlockDragger";
import { useCommand } from "./useCommand";
import { $dialog } from "@/components/DialogCom";
import { ElButton } from "element-plus";
import { $dropdown, DropdownItem } from "@/components/DropDown";
import EditorOperator from "./editor-operator";

export default defineComponent({
  props: {
    modelValue: { type: Object },
    formData: { type: Object }
  },
  emits: ['update:modelValue'],
  setup(props, ctx) {
    // 预览的时候 内容不能操作
    const previewRef = ref(false)
    const editorRef = ref(true)
    const data = computed({
      get() {
        return props.modelValue
      },
      set(newValue) {
        ctx.emit('update:modelValue', deepcopy(newValue))
      }
    })
    const containerStyles = computed(() => ({
      width: data.value.container.width + 'px',
      height: data.value.container.height + 'px'
    }))

    const config = inject('config')

    const containerRef = ref(null)
    // 1、 实现菜单的拖拽功能
    const { dragstart, dragend } = useMenuDragger(containerRef, data)
    let { blockMousedown, containerMousedown, focusData, lastSelectBlock, clearBlockFocus } = useFocus(data, previewRef, (e) => {
      mousedown(e)
    });
    //2、实现组件拖拽
    let { mousedown, markLine } = useBlockDragger(focusData, lastSelectBlock, data)
    const blockStyle = function (block) {
      if (previewRef.value) {
        return 'editor-block editor-block-preview'
      } else {
        if (block.focus) {
          return 'editor-block editor-block-focus'
        } else {
          return 'editor-block'
        }
      }
    }


    const { commands } = useCommand(data, focusData)
    const buttons = [
      { label: '撤销', handler: () => commands.undo() },
      { label: '重做', handler: () => commands.redo() },
      {
        label: '导出', handler: () => {
          $dialog({
            title: '导出json使用',
            content: JSON.stringify(data.value)
          })
        }
      },
      {
        label: '导入', handler: () => {
          $dialog({
            title: '导入json使用',
            content: '',
            footer: true,
            onConfirm(text) {
              // data.value = JSON.parse(text) //无法保留历史记录
              commands.updateContainer(JSON.parse(text))
            }
          })
        }
      },
      { label: '置顶', handler: () => commands.placeTop() },
      { label: '置底', handler: () => commands.placeBottom() },
      { label: '删除', handler: () => commands.delete() },
      {
        label: () => previewRef.value ? '编辑' : '预览', handler: () => {
          previewRef.value = !previewRef.value;
          clearBlockFocus()
        }
      },
      {
        label: '关闭', handler: () => {
          editorRef.value = false
          clearBlockFocus()
        }
      },
    ];

    const onContextMenuBlock = (e, block) => {
      e.preventDefault();
      $dropdown({
        el: e.target,
        content: () => {
          return (
            <>
              <DropdownItem label="删除" onClick={() => commands.delete()}></DropdownItem>
              <DropdownItem label="置顶" onClick={() => commands.placeTop()}></DropdownItem>
              <DropdownItem label="置底" onClick={() => commands.placeBottom()}></DropdownItem>
              <DropdownItem label="查看" onClick={() => {
                $dialog({
                  title: '查看节点数据',
                  content: JSON.stringify(block)
                })
              }}></DropdownItem>
              <DropdownItem label="导入" onClick={() => {
                $dialog({
                  title: '查看节点数据',
                  content: '',
                  footer: true,
                  onConfirm(text) {
                    text = JSON.parse(text)
                    commands.updateBlock(text, block)
                  }
                })
              }}></DropdownItem>
            </>
          )
        }
      })
    }

    return () => !editorRef.value ? <>
      <div><ElButton type="primary" onClick={() => editorRef.value = true}>继续编辑</ElButton>
        {JSON.stringify(props.formData)}
      </div>
      <div
        className="editor-container-canvas-content"
        style={containerStyles.value}
      >
        {
          data.value.blocks.map(block => (
            <EditorBlock
              block={block}
              className={'editor-block editor-block-preview'}
              formData={props.formData}
            ></EditorBlock>
          ))
        }
      </div>

    </> : (<div className="editor">
      <div className="editor-left">
        {/* 根据注册列表 渲染对应的内容 可以实现h5的拖拽 */}
        {config.componentList.map(component => (
          <div
            className="editor-left-item"
            draggable
            onDragstart={e => dragstart(e, component)}
            onDragend={dragend}
          >
            <span>{component.label}</span>
            <div>{component.preview()}</div>
          </div>
        ))}
      </div>
      <div className="editor-top">
        {buttons.map((btn) => {
          const label = typeof btn.label == 'function' ? btn.label() : btn.label
          return <div className="editor-top-button" onClick={btn.handler}>
            <span>{label}</span>
          </div>
        })}
      </div>
      <div className="editor-right">
        <EditorOperator
          block={lastSelectBlock.value}
          data={data.value}
          updateContainer={commands.updateContainer}
          updateBlock={commands.updateBlock}
        ></EditorOperator>
      </div>
      <div className="editor-container">
        {/* 负责产生滚动条 */}
        <div className="editor-container-canvas">
          {/* 产生内容区域 */}
          <div className="editor-container-canvas-content"
            style={containerStyles.value}
            ref={containerRef}
            onMousedown={containerMousedown}
          >

            {
              data.value.blocks.map((block, index) => (
                <EditorBlock
                  block={block}
                  onMousedown={(e) => blockMousedown(e, block, index)}
                  onContextmenu={(e) => onContextMenuBlock(e, block)}
                  className={blockStyle(block)}
                  formData={props.formData}
                ></EditorBlock>
              ))
            }
            {markLine.x !== null && <div className="line-x" style={{ left: markLine.x + 'px' }}></div>}
            {markLine.y !== null && <div className="line-y" style={{ top: markLine.y + 'px' }}></div>}
          </div>


        </div>
      </div>
    </div >)
  }
})