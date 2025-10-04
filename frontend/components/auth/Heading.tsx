type SizeVariant = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

interface IHeading {
    text: string
    size: SizeVariant
}

const sizeVariants = {
    "xs": "text-xs",
    "sm": "text-sm",
    "base": "text-base",
    "lg": "text-lg",
    "xl": "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
    "5xl": "text-5xl",
}

const Heading = (props: IHeading) => {
    return (
        <h1 className={`${sizeVariants[props.size]} font-semibold pb-3 text-center`}>{props.text}</h1>
    )
}

export default Heading