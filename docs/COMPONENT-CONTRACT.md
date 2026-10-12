# Shared implementation contract

Use `src/lib/types.ts` Item / Kind / Settings. Do not change shared files; request additions in your report. Implement your owned page files and optional domain-local CSS/helper files only. Do not spawn other agents.

`useStore` from `../lib/store` returns `{items,settings,timer,ready,error,readOnly,saving,create,update,remove,setSettings,setTimer,notify,completeTask,touch}`.

- `create(kind: Kind, values: Partial<Item>): Item` assigns id/timestamps. Supply title. Can use return id.
- `update(id: string, patch: Partial<Item>): void`; `remove(id:string):void` (confirm in UI before calling).
- `setSettings(patch: Partial<Settings>):void`; `setTimer(patch: Partial<TimerState>):void`.
- `notify(message:string, tone?:'success'|'error'|'info'):void`.
- `completeTask(id:string):void` toggles completion and creates next recurring task where applicable.
- `touch(id:string):void` records recently opened item.

Utilities in `../lib/utils`: `today()`, `addDays(day,n)`, `formatDate(value?,long?)`, `percent(n,total)`, `isDone(item)`, `navigate(page,id?)`, `safeUrl`, `cx`.

Components from `../components/ui`:

- `PageHeader`: `{eyebrow?:string,title:string,description?:string,actions?:ReactNode}`.
- `Panel`: `{title?:string,action?:ReactNode,className?:string,children:ReactNode}`.
- `Button`: standard button props + `variant?:'primary'|'secondary'|'ghost'|'danger'` (default secondary).
- `Badge`: `{children:ReactNode,tone?:string}`.
- `Empty`: `{title:string,description?:string,action?:ReactNode,icon?:ReactNode}`.
- `Modal`: `{title:string,onClose:()=>void,children:ReactNode,footer?:ReactNode,wide?:boolean}`; traps focus, Escape, restore.
- `Field`: `{label:string,children:ReactNode,hint?:string}`. Raw input/select/textarea receive shared styling.
- `Tabs`: `{options:{id:string,label:string,count?:number}[],value:string,onChange:(id:string)=>void}`.
- `Progress`: `{value:number,label?:string}`; `Stat`: `{label:string,value:ReactNode,hint?:string,icon?:ReactNode}`.
- `Markdown`: `{children:string}`; safe GFM, no raw HTML.
- `Confirm`: `{title:string,message:string,onConfirm:()=>void,onClose:()=>void}`.
- `ItemEditor`: `{kind:Kind,initial?:Partial<Item>,fields:FieldDef[],onClose:()=>void,onSaved?:(item:Item)=>void,title?:string}`; title input implicit, save/update/persist, validation.
- `RecordManager`: `{kind:Kind,title:string,description?:string,fields:FieldDef[],filter?:(item:Item)=>boolean,defaults?:Partial<Item>,statuses?:string[],empty?:string}`; built-in create/edit/delete/search/status filter/list; reads hash record id and opens editor, supports `#route/new`.
- `FieldDef`: `{key:keyof Item,label:string,type?:'text'|'textarea'|'number'|'date'|'time'|'select'|'url'|'tags'|'checkbox'|'code',options?:{value:string,label:string}[],required?:boolean,min?:number,max?:number,placeholder?:string,full?:boolean}`.

Route names: dashboard, planner, java, dsa, competitive, web, projects, notes, focus, cards, college, analytics, settings. Optional selected id is hash segment 2. Page components accept `{recordId?:string}` when useful, otherwise no props. Default exports: Planner, Projects, College, Learning (`{domain:'java'|'dsa'|'cp'|'web',recordId?:string}`), Notes, Focus, Cards.

CSS vocabulary provided centrally: `page-header`, `eyebrow`, `muted`, `mono`, `panel`, `panel-body`, `stack`, `stack-sm`, `row`, `row-between`, `grid-2`, `grid-3`, `grid-4`, `stats-grid`, `toolbar`, `button`, `icon-button`, `list-row`, `record-list`, `badge`, `empty-state`, `form-grid`, `field`, `divider`, `subheading`, `small`, `text-accent`, `text-danger`, `card-grid`, `checklist`, `progress`, `table-wrap`. Add scoped styles in your own CSS for special views; import it from your page. Use icon library lucide-react. Use real empty states, no fake activity. Use local date utilities, not UTC date slicing for day grouping.
