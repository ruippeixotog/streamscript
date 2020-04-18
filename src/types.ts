
export type ComponentSpec = {
  ins: string[],
  outs: string[],
}

export type ComponentDef<Impl> = {
  spec: ComponentSpec,
  impl: Impl
}

export type ComponentStore<Impl> = {
  components: { [name: string]: ComponentDef<Impl> },
  specials: {
    identity: string,
    binOps: { [op: string]: string },
    unOps: { [op: string]: string },
    arrayPush: string,
    objectSet: string
  }
}
